import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'

// GET /api/traceability/forward/[ingredientLotId] - Find all products using this ingredient lot
export async function GET(
  request: NextRequest,
  { params }: { params: { ingredientLotId: string } }
) {
  try {
    const ingredientLotId = parseInt(params.ingredientLotId)
    
    if (isNaN(ingredientLotId)) {
      return NextResponse.json(
        {
          error: 'Invalid ingredient lot ID',
          code: 'INVALID_ID',
          details: { ingredientLotId: params.ingredientLotId }
        },
        { status: 400 }
      )
    }
    
    // First, verify the ingredient lot exists and get its details
    const ingredientLot = await withDatabaseErrorHandling(
      async () => prisma.ingredientLot.findUnique({
        where: { id: ingredientLotId },
        include: {
          Ingredient: {
            select: {
              id: true,
              name: true,
              supplierName: true,
              allergens: true
            }
          }
        }
      }),
      'Ingredient lot lookup for forward traceability'
    )
    
    if (!ingredientLot) {
      return NextResponse.json(
        {
          error: 'Ingredient lot not found',
          code: 'NOT_FOUND',
          details: { ingredientLotId }
        },
        { status: 404 }
      )
    }
    
    // Find all production runs that used this ingredient lot
    const productionRuns = await withDatabaseErrorHandling(
      async () => prisma.productionRun.findMany({
        where: {
          BatchIngredient: {
            some: {
              ingredientLotId: ingredientLotId
            }
          }
        },
        include: {
          Recipe: {
            select: {
              id: true,
              name: true,
              version: true
            }
          },
          BatchIngredient: {
            where: {
              ingredientLotId: ingredientLotId
            },
            include: {
              IngredientLot: {
                include: {
                  Ingredient: {
                    select: {
                      id: true,
                      name: true,
                      supplierName: true
                    }
                  }
                }
              }
            }
          },
          Pallet: {
            select: {
              id: true,
              palletCode: true,
              quantityPacked: true,
              location: true,
              shippingStatus: true,
              expirationDate: true,
              notes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      'Production runs lookup for forward traceability'
    )
    
    // Get all affected pallets with detailed information
    const affectedPallets = productionRuns.flatMap(run => 
      run.Pallet.map(pallet => ({
        ...pallet,
        productionRun: {
          id: run.id,
          dailyLot: run.dailyLot,
          qualityStatus: run.qualityStatus,
          actualQuantity: run.actualQuantity,
          createdAt: run.createdAt
        },
        recipe: run.Recipe
      }))
    )
    
    // Build traceability chain showing the flow
    const traceabilityChain = [
      {
        level: 1,
        type: 'ingredient_lot' as const,
        id: ingredientLot.id,
        description: `${ingredientLot.Ingredient.name} (Lot: ${ingredientLot.internalLotCode})`,
        details: {
          lotCode: ingredientLot.internalLotCode,
          supplierLotCode: ingredientLot.supplierLotCode,
          receivedDate: ingredientLot.receivedDate,
          qualityStatus: ingredientLot.qualityStatus
        },
        date: ingredientLot.receivedDate
      },
      ...productionRuns.flatMap(run => [
        {
          level: 2,
          type: 'production_run' as const,
          id: run.id,
          description: `Production Run ${run.dailyLot} (${run.Recipe.name})`,
          details: {
            dailyLot: run.dailyLot,
            recipeName: run.Recipe.name,
            qualityStatus: run.qualityStatus,
            quantityUsed: run.BatchIngredient[0]?.quantityUsed || 0
          },
          date: run.createdAt
        },
        ...run.Pallet.map((pallet, index) => ({
          level: 3,
          type: 'pallet' as const,
          id: pallet.id,
          description: `Pallet ${pallet.palletCode || pallet.id} (${pallet.quantityPacked || 'N/A'} units)`,
          details: {
            palletCode: pallet.palletCode,
            shippingStatus: pallet.shippingStatus,
            location: pallet.location,
            quantityPacked: pallet.quantityPacked
          },
          date: run.createdAt
        }))
      ])
    ]
    
    // Calculate impact statistics
    const totalProductionRuns = productionRuns.length
    const totalPallets = affectedPallets.length
    const shippedPallets = affectedPallets.filter(p => p.shippingStatus === 'shipped').length
    const inventoryPallets = affectedPallets.filter(p => p.shippingStatus === 'pending').length
    const totalQuantityProduced = productionRuns.reduce((sum, run) => sum + Number(run.actualQuantity || run.plannedQuantity || 0), 0)
    
    // Group pallets by customer orders for impact assessment
    const customerImpact = affectedPallets
      .filter(p => p.shippingStatus === 'shipped')
      .reduce((acc, pallet) => {
        const order = `Order-${pallet.id}`
        if (!acc[order]) {
          acc[order] = {
            customerOrder: order,
            pallets: [],
            totalQuantity: 0
          }
        }
        acc[order].pallets.push(pallet.palletCode || pallet.id.toString())
        acc[order].totalQuantity += Number(pallet.quantityPacked || 0)
        return acc
      }, {} as Record<string, any>)
    
    const response = {
      source: {
        ingredientLot: {
          id: ingredientLot.id,
          internalLotCode: ingredientLot.internalLotCode,
          ingredient: ingredientLot.Ingredient,
          supplierLotCode: ingredientLot.supplierLotCode,
          receivedDate: ingredientLot.receivedDate,
          qualityStatus: ingredientLot.qualityStatus
        }
      },
      impact: {
        totalProductionRuns,
        totalPallets,
        shippedPallets,
        inventoryPallets,
        totalQuantityProduced,
        customerOrdersAffected: Object.keys(customerImpact).length,
        customerImpact: Object.values(customerImpact)
      },
      productionRuns: productionRuns.map(run => ({
        id: run.id,
        dailyLot: run.dailyLot,
        cakeLot: run.cakeLot,
        icingLot: run.icingLot,
        qualityStatus: run.qualityStatus,
        plannedQuantity: run.plannedQuantity,
        actualQuantity: run.actualQuantity,
        recipe: run.Recipe,
        usageDetails: run.BatchIngredient[0],
        palletsProduced: run.Pallet.length,
        createdAt: run.createdAt
      })),
      affectedPallets,
      traceabilityChain: traceabilityChain.sort((a, b) => a.level - b.level || new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(`Error in forward traceability for ingredient lot ${params.ingredientLotId}:`, error)
    
    return NextResponse.json(
      {
        error: 'Failed to perform forward traceability',
        code: 'TRACEABILITY_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
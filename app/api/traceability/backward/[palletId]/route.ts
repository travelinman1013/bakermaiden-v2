import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'

// GET /api/traceability/backward/[palletId] - Find all ingredient lots used to make this pallet
export async function GET(
  request: NextRequest,
  { params }: { params: { palletId: string } }
) {
  try {
    const palletId = parseInt(params.palletId)
    
    if (isNaN(palletId)) {
      return NextResponse.json(
        {
          error: 'Invalid pallet ID',
          code: 'INVALID_ID',
          details: { palletId: params.palletId }
        },
        { status: 400 }
      )
    }
    
    // First, verify the pallet exists and get its production run details
    const pallet = await withDatabaseErrorHandling(
      async () => prisma.pallet.findUnique({
        where: { id: palletId },
        include: {
          ProductionRun: {
            include: {
              Recipe: {
                select: {
                  id: true,
                  name: true,
                  version: true,
                  description: true
                }
              },
              BatchIngredient: {
                include: {
                  IngredientLot: {
                    select: {
                      id: true,
                      internalLotCode: true,
                      supplierLotCode: true,
                      quantityReceived: true,
                      quantityRemaining: true,
                      receivedDate: true,
                      expirationDate: true,
                      manufactureDate: true,
                      qualityStatus: true,
                      Ingredient: {
                        select: {
                          id: true,
                          name: true,
                          allergens: true,
                          supplierName: true,
                          supplierCode: true,
                          storageType: true
                        }
                      }
                    }
                  }
                },
                orderBy: { createdAt: 'asc' }
              }
            }
          }
        }
      }),
      'Pallet lookup for backward traceability'
    )
    
    if (!pallet) {
      return NextResponse.json(
        {
          error: 'Pallet not found',
          code: 'NOT_FOUND',
          details: { palletId }
        },
        { status: 404 }
      )
    }
    
    const productionRun = pallet.ProductionRun
    const batchIngredients = productionRun.BatchIngredient
    
    // Get all ingredient lots used in this production run
    const ingredientLots = batchIngredients.map(bi => ({
      ...bi.IngredientLot,
      ingredient: bi.IngredientLot.Ingredient,
      usageDetails: {
        quantityUsed: bi.quantityUsed,
        addedAt: bi.addedAt,
        addedBy: bi.addedBy,
        notes: bi.notes
      }
    }))
    
    // Build traceability chain showing the backward flow
    const traceabilityChain = [
      {
        level: 1,
        type: 'pallet' as const,
        id: pallet.id,
        description: `Pallet ${pallet.palletCode || pallet.id} (${pallet.quantityPacked ? Number(pallet.quantityPacked) : 'N/A'} units)`,
        details: {
          palletCode: pallet.palletCode,
          quantityPacked: pallet.quantityPacked ? Number(pallet.quantityPacked) : null,
          shippingStatus: pallet.shippingStatus,
          location: pallet.location,
          packingDate: pallet.packingDate,
          expirationDate: pallet.expirationDate,
          notes: pallet.notes
        },
        date: pallet.createdAt
      },
      {
        level: 2,
        type: 'production_run' as const,
        id: productionRun.id,
        description: `Production Run ${productionRun.dailyLot} (${productionRun.Recipe.name})`,
        details: {
          dailyLot: productionRun.dailyLot,
          cakeLot: productionRun.cakeLot,
          icingLot: productionRun.icingLot,
          recipeName: productionRun.Recipe.name,
          qualityStatus: productionRun.qualityStatus,
          plannedQuantity: productionRun.plannedQuantity,
          actualQuantity: productionRun.actualQuantity,
          primaryOperatorId: productionRun.primaryOperatorId
        },
        date: productionRun.createdAt
      },
      ...batchIngredients.map((bi, index) => ({
        level: 3,
        type: 'ingredient_lot' as const,
        id: bi.IngredientLot.id,
        description: `${bi.IngredientLot.Ingredient.name} - Lot ${bi.IngredientLot.internalLotCode} (${bi.quantityUsed} units)`,
        details: {
          ingredientName: bi.IngredientLot.Ingredient.name,
          storageType: bi.IngredientLot.Ingredient.storageType,
          lotCode: bi.IngredientLot.internalLotCode,
          supplierName: bi.IngredientLot.Ingredient.supplierName,
          quantityUsed: bi.quantityUsed,
          receivedDate: bi.IngredientLot.receivedDate,
          expirationDate: bi.IngredientLot.expirationDate,
          qualityStatus: bi.IngredientLot.qualityStatus
        },
        date: bi.IngredientLot.receivedDate
      }))
    ]
    
    // Analyze supply chain risk factors
    const riskFactors: Array<{
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      description: string;
      ingredientLotId?: number;
      allergens?: string[];
    }> = []
    
    // Check for expired or near-expiration ingredients
    const now = new Date()
    const nearExpirationDays = 30
    const nearExpirationDate = new Date(now.getTime() + (nearExpirationDays * 24 * 60 * 60 * 1000))
    
    ingredientLots.forEach(lot => {
      if (lot.expirationDate) {
        const expDate = new Date(lot.expirationDate)
        if (expDate <= now) {
          riskFactors.push({
            type: 'EXPIRED_INGREDIENT',
            severity: 'HIGH',
            description: `${lot.ingredient.name} (Lot ${lot.internalLotCode}) was expired when used`
          })
        } else if (expDate <= nearExpirationDate) {
          riskFactors.push({
            type: 'NEAR_EXPIRATION',
            severity: 'MEDIUM',
            description: `${lot.ingredient.name} (Lot ${lot.internalLotCode}) was near expiration when used`
          })
        }
      }
      
      // Check for failed quality status
      if (lot.qualityStatus === 'failed') {
        riskFactors.push({
          type: 'QUALITY_FAILURE',
          severity: 'CRITICAL',
          description: `${lot.ingredient.name} (Lot ${lot.internalLotCode}) failed quality checks`
        })
      }
      
      // Note: Recall status tracking not implemented in current schema
      
      // Check for allergen concerns
      if (lot.ingredient.allergens && lot.ingredient.allergens.length > 0) {
        riskFactors.push({
          type: 'ALLERGEN_PRESENT',
          severity: 'MEDIUM',
          description: `${lot.ingredient.name} contains allergens: ${lot.ingredient.allergens.join(', ')}`,
          allergens: lot.ingredient.allergens
        })
      }
    })
    
    // Group ingredients by supplier for supply chain analysis
    const supplierAnalysis = ingredientLots.reduce((acc, lot) => {
      const supplier = lot.ingredient.supplierName
      if (!acc[supplier]) {
        acc[supplier] = {
          supplierName: supplier,
          ingredientsSupplied: [],
          totalQuantityUsed: 0,
          lotCount: 0,
          qualityIssues: 0
        }
      }
      
      acc[supplier].ingredientsSupplied.push({
        name: lot.ingredient.name,
        lotCode: lot.internalLotCode,
        quantityUsed: lot.usageDetails.quantityUsed,
        qualityStatus: lot.qualityStatus
      })
      acc[supplier].totalQuantityUsed += lot.usageDetails.quantityUsed
      acc[supplier].lotCount++
      
      if (lot.qualityStatus === 'failed' || lot.qualityStatus === 'quarantined') {
        acc[supplier].qualityIssues++
      }
      
      return acc
    }, {} as Record<string, any>)
    
    const response = {
      target: {
        pallet: {
          id: pallet.id,
          palletCode: pallet.palletCode,
          quantityPacked: pallet.quantityPacked ? Number(pallet.quantityPacked) : null,
          location: pallet.location,
          shippingStatus: pallet.shippingStatus,
          packingDate: pallet.packingDate,
          expirationDate: pallet.expirationDate,
          notes: pallet.notes
        },
        productionRun: {
          id: productionRun.id,
          dailyLot: productionRun.dailyLot,
          cakeLot: productionRun.cakeLot,
          icingLot: productionRun.icingLot,
          qualityStatus: productionRun.qualityStatus,
          actualQuantity: productionRun.actualQuantity ? Number(productionRun.actualQuantity) : null,
          primaryOperatorId: productionRun.primaryOperatorId,
          createdAt: productionRun.createdAt
        }
      },
      ingredientLots: ingredientLots.map(lot => ({
        id: lot.id,
        lotCode: lot.internalLotCode,
        internalLotCode: lot.internalLotCode,
        ingredient: lot.ingredient,
        supplierName: lot.ingredient.supplierName,
        supplierLotCode: lot.supplierLotCode,
        receivedDate: lot.receivedDate,
        expirationDate: lot.expirationDate,
        qualityStatus: lot.qualityStatus,
        usageDetails: lot.usageDetails
      })),
      traceabilityChain: traceabilityChain.sort((a, b) => a.level - b.level || new Date(b.date).getTime() - new Date(a.date).getTime()),
      supplierAnalysis: Object.values(supplierAnalysis),
      riskAssessment: {
        totalRiskFactors: riskFactors.length,
        criticalIssues: riskFactors.filter(r => r.severity === 'CRITICAL').length,
        highIssues: riskFactors.filter(r => r.severity === 'HIGH').length,
        mediumIssues: riskFactors.filter(r => r.severity === 'MEDIUM').length,
        riskFactors
      },
      summary: {
        totalIngredientLots: ingredientLots.length,
        totalSuppliers: Object.keys(supplierAnalysis).length,
        qualityPassedLots: ingredientLots.filter(lot => lot.qualityStatus === 'passed').length,
        qualityFailedLots: ingredientLots.filter(lot => lot.qualityStatus === 'failed').length,
        activeStatus: ingredientLots.filter(lot => lot.qualityStatus === 'passed').length,
        recalledLots: ingredientLots.filter(lot => lot.qualityStatus === 'quarantined').length
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(`Error in backward traceability for pallet ${params.palletId}:`, error)
    
    return NextResponse.json(
      {
        error: 'Failed to perform backward traceability',
        code: 'TRACEABILITY_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'

// GET /api/traceability/recall/[ingredientLotId] - Complete recall impact assessment
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
    
    // Get the ingredient lot and verify it exists
    const ingredientLot = await withDatabaseErrorHandling(
      async () => prisma.ingredientLot.findUnique({
        where: { id: ingredientLotId },
        include: {
          Ingredient: {
            select: {
              id: true,
              name: true,
              storageType: true,
              allergens: true,
              supplierName: true
            }
          }
        }
      }),
      'Ingredient lot lookup for recall impact'
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
    
    // Find all production runs and products that used this ingredient lot
    const affectedProductionRuns = await withDatabaseErrorHandling(
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
            select: {
              quantityUsed: true,
              addedAt: true,
              addedBy: true
            }
          },
          Pallet: {
            select: {
              id: true,
              palletCode: true,
              quantityPacked: true,
              location: true,
              shippingStatus: true,
              packingDate: true,
              notes: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }),
      'Production runs lookup for recall impact'
    )
    
    // Categorize pallets by status for impact assessment
    const palletsByStatus = affectedProductionRuns
      .flatMap(run => run.Pallet.map(pallet => ({
        ...pallet,
        productionRun: {
          id: run.id,
          dailyLot: run.dailyLot,
          recipeName: run.Recipe.name,
          createdAt: run.createdAt
        }
      })))
      .reduce((acc, pallet) => {
        const status = pallet.shippingStatus || 'pending'
        if (!acc[status]) {
          acc[status] = []
        }
        acc[status].push(pallet)
        return acc
      }, {} as Record<string, any[]>)
    
    // Analyze customer impact for shipped products
    const customerImpact = (palletsByStatus['shipped'] || []).reduce((acc, pallet) => {
      if (pallet.notes && pallet.notes.includes('ORDER:')) {
        const order = pallet.notes.match(/ORDER:\s*(\w+)/)?.[1] || 'UNKNOWN'
        if (!acc[order]) {
          acc[order] = {
            customerOrder: order,
            pallets: [],
            totalItems: 0,
            totalWeight: 0,
            shippedDate: pallet.shippedAt,
            productionRuns: new Set()
          }
        }
        
        acc[order].pallets.push({
          palletCode: pallet.palletCode,
          quantity: pallet.quantityPacked || 0,
          productionBatch: pallet.productionRun.dailyLot
        })
        acc[order].totalItems += Number(pallet.quantityPacked) || 0
        acc[order].productionRuns.add(pallet.productionRun.dailyLot)
      }
      return acc
    }, {} as Record<string, any>)
    
    // Convert Set to Array for JSON serialization
    Object.values(customerImpact).forEach((impact: any) => {
      impact.productionRuns = Array.from(impact.productionRuns)
    })
    
    // Calculate time-based urgency
    const now = new Date()
    const urgencyAssessment = {
      immediateAction: [] as any[],
      highPriority: [] as any[],
      mediumPriority: [] as any[],
      lowPriority: [] as any[]
    }
    
    affectedProductionRuns.forEach(run => {
      const daysSinceProduction = Math.floor((now.getTime() - run.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const shippedPallets = run.Pallet.filter(p => p.shippingStatus === 'shipped').length
      const activePallets = run.Pallet.filter(p => p.shippingStatus === 'pending').length
      
      const assessmentItem = {
        productionRunId: run.id,
        dailyLot: run.dailyLot,
        recipeName: run.Recipe.name,
        daysSinceProduction,
        totalPallets: run.Pallet.length,
        shippedPallets,
        activePallets,
        createdAt: run.createdAt
      }
      
      if (shippedPallets > 0 && daysSinceProduction <= 7) {
        urgencyAssessment.immediateAction.push(assessmentItem)
      } else if (shippedPallets > 0 && daysSinceProduction <= 30) {
        urgencyAssessment.highPriority.push(assessmentItem)
      } else if (activePallets > 0) {
        urgencyAssessment.mediumPriority.push(assessmentItem)
      } else {
        urgencyAssessment.lowPriority.push(assessmentItem)
      }
    })
    
    // Generate recall action plan
    const actionPlan = {
      immediateActions: [
        'Identify and quarantine all remaining inventory from affected production runs',
        'Contact customers who received shipped products within the last 30 days',
        'Issue recall notices for all affected products',
        'Coordinate with regulatory authorities if required'
      ],
      notifications: {
        customers: Object.keys(customerImpact).length,
        customerOrders: Object.keys(customerImpact),
        regulatoryRequired: ingredientLot.Ingredient.storageType === 'refrigerated' || 
                          ingredientLot.Ingredient.allergens?.includes('nuts') ||
                          ingredientLot.Ingredient.allergens?.includes('wheat'),
        mediaRequired: (palletsByStatus['shipped'] || []).length > 100
      },
      inventory: {
        activeInventoryPallets: (palletsByStatus['pending'] || []).length,
        totalPalletsToQuarantine: (palletsByStatus['pending'] || []).length + (palletsByStatus['shipped'] || []).filter((p: any) => !p.notes?.includes('ORDER:')).length,
        estimatedFinancialImpact: (palletsByStatus['pending'] || []).reduce((sum, p) => sum + (Number(p.quantityPacked) || 0), 0) * 10 // Rough estimate
      },
      timeline: {
        hour1: 'Quarantine remaining inventory and halt production',
        hour4: 'Complete internal traceability analysis',
        hour8: 'Begin customer notifications',
        day1: 'File regulatory notifications if required',
        day2: 'Complete customer recall notifications',
        week1: 'Assess effectiveness and recovery plan'
      }
    }
    
    // Calculate overall risk score
    const riskScore = {
      customerExposure: Math.min(Object.keys(customerImpact).length * 10, 100),
      volumeImpact: Math.min((palletsByStatus['shipped'] || []).length * 5, 100),
      timeUrgency: Math.max(0, 100 - (Math.min(...affectedProductionRuns.map(r => Math.floor((now.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60 * 24)))) * 2)),
      allergenRisk: ingredientLot.Ingredient.allergens?.length ? 50 : 0,
      regulatoryRisk: actionPlan.notifications.regulatoryRequired ? 75 : 25
    }
    
    const totalRiskScore = Math.round(
      (riskScore.customerExposure * 0.3 + 
       riskScore.volumeImpact * 0.25 + 
       riskScore.timeUrgency * 0.2 + 
       riskScore.allergenRisk * 0.15 + 
       riskScore.regulatoryRisk * 0.1)
    )
    
    const response = {
      recallTarget: {
        ingredientLot: {
          id: ingredientLot.id,
          internalLotCode: ingredientLot.internalLotCode,
          ingredient: ingredientLot.Ingredient,
          supplierName: ingredientLot.supplierLotCode,
          receivedDate: ingredientLot.receivedDate,
          qualityStatus: ingredientLot.qualityStatus
        }
      },
      impactSummary: {
        totalProductionRuns: affectedProductionRuns.length,
        totalPalletsAffected: affectedProductionRuns.reduce((sum, run) => sum + run.Pallet.length, 0),
        shippedProducts: (palletsByStatus['shipped'] || []).length,
        activeInventory: (palletsByStatus['pending'] || []).length,
        customersAffected: Object.keys(customerImpact).length,
        earliestProduction: affectedProductionRuns[0]?.createdAt,
        latestProduction: affectedProductionRuns[affectedProductionRuns.length - 1]?.createdAt
      },
      affectedProductionRuns: affectedProductionRuns.map(run => ({
        id: run.id,
        dailyLot: run.dailyLot,
        recipe: run.Recipe,
        qualityStatus: run.qualityStatus,
        actualQuantity: run.actualQuantity,
        usageDetails: run.BatchIngredient[0],
        pallets: run.Pallet,
        createdAt: run.createdAt
      })),
      palletsByStatus: Object.entries(palletsByStatus).map(([status, pallets]) => ({
        status,
        count: pallets.length,
        totalQuantity: pallets.reduce((sum, p) => sum + (Number(p.quantityPacked) || 0), 0),
        pallets
      })),
      customerImpact: Object.values(customerImpact),
      urgencyAssessment,
      riskAssessment: {
        totalRiskScore,
        riskLevel: totalRiskScore >= 80 ? 'CRITICAL' : 
                  totalRiskScore >= 60 ? 'HIGH' : 
                  totalRiskScore >= 40 ? 'MEDIUM' : 'LOW',
        riskFactors: riskScore,
        recommendedActions: totalRiskScore >= 80 
          ? ['IMMEDIATE_RECALL', 'REGULATORY_NOTIFICATION', 'MEDIA_ALERT']
          : totalRiskScore >= 60 
            ? ['CONTROLLED_RECALL', 'CUSTOMER_NOTIFICATION']
            : ['INVENTORY_QUARANTINE', 'INTERNAL_INVESTIGATION']
      },
      actionPlan,
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString() // 24 hour validity
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error(`Error in recall impact assessment for ingredient lot ${params.ingredientLotId}:`, error)
    
    return NextResponse.json(
      {
        error: 'Failed to perform recall impact assessment',
        code: 'RECALL_ASSESSMENT_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
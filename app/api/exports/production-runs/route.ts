import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'

// GET /api/exports/production-runs - Export production runs to CSV for regulatory submissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')
    const format = searchParams.get('format') || 'csv'
    
    // Build where clause based on filters
    const whereClause: any = {}
    
    if (startDate && endDate) {
      whereClause.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    
    if (status) {
      whereClause.qualityStatus = status
    }
    
    // Fetch production runs with all traceability data
    const productionRuns = await withDatabaseErrorHandling(
      async () => prisma.productionRun.findMany({
        where: whereClause,
        select: {
          id: true,
          dailyLot: true,
          cakeLot: true,
          icingLot: true,
          recipeId: true,
          plannedQuantity: true,
          actualQuantity: true,
          startTime: true,
          endTime: true,
          primaryOperatorId: true,
          assistantOperatorId: true,
          inspectorId: true,
          equipmentStation: true,
          qualityStatus: true,
          temperature: true,
          humidity: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          Recipe: {
            select: {
              id: true,
              name: true,
              version: true,
              description: true,
            }
          },
          BatchIngredient: {
            include: {
              IngredientLot: {
                include: {
                  Ingredient: {
                    select: {
                      id: true,
                      name: true,
                      supplierName: true,
                      supplierCode: true,
                      storageType: true,
                      allergens: true,
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
              packingDate: true,
              expirationDate: true,
              shippingStatus: true,
              location: true,
              notes: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      'Production runs export query'
    )
    
    if (format === 'json') {
      return NextResponse.json({
        productionRuns,
        exportedAt: new Date().toISOString(),
        totalRecords: productionRuns.length,
        filters: { startDate, endDate, status },
      })
    }
    
    // Generate CSV format for regulatory compliance
    const csvHeaders = [
      'Batch Number',
      'Daily Lot',
      'Cake Lot', 
      'Icing Lot',
      'Recipe Name',
      'Recipe Version',
      'Production Status',
      'Quality Status',
      'Planned Quantity',
      'Actual Quantity',
      'Yield %',
      'Start Time',
      'End Time',
      'Duration (minutes)',
      'Primary Operator',
      'Quality Check By',
      'Quality Check Date',
      'Temperature (°C)',
      'Humidity (%)',
      'Production Notes',
      'Quality Notes',
      'Issues Encountered',
      'Ingredient Count',
      'Ingredient Names',
      'Ingredient Lot Codes',
      'Supplier Names',
      'Allergens',
      'Pallets Count',
      'Pallet Numbers',
      'Shipped Pallets',
      'Inventory Pallets',
      'Customer Orders',
      'Created Date',
      'Created By',
      'Updated Date',
      'Updated By',
    ]
    
    const csvRows = productionRuns.map(run => {
      const plannedQty = run.plannedQuantity ? Number(run.plannedQuantity) : 0
      const actualQty = run.actualQuantity ? Number(run.actualQuantity) : 0
      const yieldPercentage = plannedQty > 0 
        ? (actualQty / plannedQty * 100).toFixed(2)
        : '0.00'
      
      const durationMinutes = run.startTime && run.endTime
        ? Math.round((run.endTime.getTime() - run.startTime.getTime()) / (1000 * 60))
        : null
        
      const ingredientNames = run.BatchIngredient.map(bi => bi.IngredientLot.Ingredient.name).join('; ')
      const ingredientLotCodes = run.BatchIngredient.map(bi => bi.IngredientLot.internalLotCode).join('; ')
      const supplierNames = Array.from(new Set(run.BatchIngredient.map(bi => bi.IngredientLot.Ingredient.supplierName))).join('; ')
      const allergens = Array.from(new Set(run.BatchIngredient.flatMap(bi => bi.IngredientLot.Ingredient.allergens))).join('; ')
      
      const palletNumbers = run.Pallet.map(p => p.palletCode || p.id.toString()).join('; ')
      const shippedPallets = run.Pallet.filter(p => p.shippingStatus === 'shipped').length
      const inventoryPallets = run.Pallet.filter(p => p.shippingStatus === 'pending').length
      const customerOrders = Array.from(new Set(
        run.Pallet.filter(p => p.notes && p.notes.includes('Order:')).map(p => p.notes)
      )).join('; ')
      
      return [
        run.dailyLot,
        run.dailyLot,
        run.cakeLot,
        run.icingLot,
        run.Recipe.name,
        run.Recipe.version,
        '', // status - not implemented in current schema
        run.qualityStatus,
        plannedQty,
        actualQty || '',
        yieldPercentage + '%',
        run.startTime?.toISOString() || '',
        run.endTime?.toISOString() || '',
        durationMinutes || '',
        run.primaryOperatorId || '',
        '', // qualityCheckBy - needs separate user lookup
        '', // qualityCheckAt - needs quality management fields
        run.temperature ? Number(run.temperature) : '',
        run.humidity ? Number(run.humidity) : '',
        run.notes || '',
        '', // qualityNotes - needs quality management fields
        '', // issuesEncountered - needs separate issue tracking fields
        run.BatchIngredient.length,
        ingredientNames,
        ingredientLotCodes,
        supplierNames,
        allergens,
        run.Pallet.length,
        palletNumbers,
        shippedPallets,
        inventoryPallets,
        customerOrders,
        run.createdAt.toISOString(),
        '', // createdBy - not implemented in current schema
        run.updatedAt?.toISOString() || '',
        '', // updatedBy - not implemented in current schema
      ]
    })
    
    // Convert to CSV format
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const filename = `production-runs-export-${new Date().toISOString().split('T')[0]}.csv`
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
    
  } catch (error) {
    console.error('Error in production runs export:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to export production runs',
        code: 'EXPORT_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'

// GET /api/exports/traceability - Export comprehensive traceability data for regulatory submissions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const supplierName = searchParams.get('supplier')
    const ingredientType = searchParams.get('ingredientType')
    const includeRecalled = searchParams.get('includeRecalled') === 'true'
    const format = searchParams.get('format') || 'csv'
    
    // Build where clause for ingredient lots
    const ingredientLotWhere: any = {}
    
    if (startDate && endDate) {
      ingredientLotWhere.receivedDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }
    
    if (supplierName) {
      ingredientLotWhere.Ingredient = {
        supplierName: {
          contains: supplierName,
          mode: 'insensitive'
        }
      }
    }
    
    if (ingredientType) {
      ingredientLotWhere.Ingredient = {
        storageType: ingredientType
      }
    }
    
    if (!includeRecalled) {
      ingredientLotWhere.qualityStatus = {
        not: 'quarantined'
      }
    }
    
    // Fetch complete traceability chain
    const traceabilityData = await withDatabaseErrorHandling(
      async () => prisma.ingredientLot.findMany({
        where: ingredientLotWhere,
        include: {
          Ingredient: {
            select: {
              id: true,
              name: true,
              supplierName: true,
              supplierCode: true,
              storageType: true,
              allergens: true,
              certifications: true,
            }
          },
          BatchIngredient: {
            include: {
              ProductionRun: {
                include: {
                  Recipe: {
                    select: {
                      id: true,
                      name: true,
                      version: true,
                    }
                  },
                  Pallet: {
                    select: {
                      id: true,
                      palletCode: true,
                      shippingStatus: true,
                      location: true,
                      packingDate: true,
                      notes: true,
                      quantityPacked: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { receivedDate: 'desc' }
      }),
      'Traceability export query'
    )
    
    if (format === 'json') {
      return NextResponse.json({
        traceabilityData,
        exportedAt: new Date().toISOString(),
        totalIngredientLots: traceabilityData.length,
        filters: { startDate, endDate, supplierName, ingredientType, includeRecalled },
      })
    }
    
    // Generate comprehensive CSV format for regulatory compliance
    const csvHeaders = [
      // Ingredient Lot Information
      'Ingredient Lot ID',
      'Lot Code',
      'Internal Lot Code',
      'Ingredient Name',
      'Ingredient Type',
      'Supplier Name',
      'Supplier Lot Code',
      'Purchase Order',
      'Invoice Number',
      'Received Date',
      'Expiration Date',
      'Best By Date',
      'Manufacture Date',
      'Quantity Received',
      'Quantity Remaining',
      'Unit of Measure',
      'Quality Status',
      'Lot Status',
      'Storage Location',
      'Storage Temperature',
      'Storage Humidity',
      'Quality Notes',
      'Allergens',
      'Certifications',
      
      // Usage Information
      'Times Used',
      'Total Quantity Used',
      'Production Run Count',
      'Recipe Names',
      'Batch Numbers',
      'Usage Dates',
      
      // Forward Traceability - Products Made
      'Products Manufactured',
      'Total Pallets Created',
      'Total Items Produced',
      'Shipped Pallets',
      'Inventory Pallets',
      'Recalled Pallets',
      'Customer Orders',
      'Shipping Dates',
      'Current Locations',
      
      // Risk Assessment
      'Risk Level',
      'Risk Factors',
      'Recall Impact',
      'Allergen Exposure',
      
      // Audit Trail
      'Created Date',
      'Created By',
      'Updated Date', 
      'Updated By',
    ]
    
    const csvRows = traceabilityData.map(lot => {
      const usages = lot.BatchIngredient
      const totalQuantityUsed = usages.reduce((sum, bi) => sum + Number(bi.quantityUsed), 0)
      const productionRuns = usages.map(bi => bi.ProductionRun)
      const recipeNames = Array.from(new Set(productionRuns.map(pr => pr.Recipe.name))).join('; ')
      const batchNumbers = productionRuns.map(pr => pr.dailyLot).join('; ')
      const usageDates = productionRuns.map(pr => pr.createdAt.toISOString().split('T')[0]).join('; ')
      
      const allPallets = productionRuns.flatMap(pr => pr.Pallet)
      const totalItems = allPallets.reduce((sum, p) => sum + (Number(p.quantityPacked) || 0), 0)
      const shippedPallets = allPallets.filter(p => p.shippingStatus === 'shipped').length
      const inventoryPallets = allPallets.filter(p => p.shippingStatus === 'pending').length
      const recalledPallets = allPallets.filter(p => p.notes?.includes('RECALLED')).length
      
      const customerOrders = Array.from(new Set(
        allPallets.filter(p => p.notes?.includes('Order:')).map(p => p.notes)
      )).join('; ')
      
      const shippingDates = Array.from(new Set(
        allPallets.filter(p => p.packingDate).map(p => p.packingDate!.toISOString().split('T')[0])
      )).join('; ')
      
      const currentLocations = Array.from(new Set(
        allPallets.filter(p => p.location).map(p => p.location!)
      )).join('; ')
      
      // Risk assessment
      const riskFactors = []
      if (lot.qualityStatus === 'quarantined') riskFactors.push('QUARANTINED')
      if (lot.qualityStatus === 'failed') riskFactors.push('QUALITY_FAILED')
      if (lot.expirationDate && new Date(lot.expirationDate) < new Date()) riskFactors.push('EXPIRED')
      if (lot.Ingredient.allergens.length > 0) riskFactors.push('ALLERGENS_PRESENT')
      
      const riskLevel = riskFactors.includes('QUARANTINED') ? 'CRITICAL' :
                       riskFactors.includes('QUALITY_FAILED') ? 'HIGH' :
                       riskFactors.includes('EXPIRED') ? 'MEDIUM' : 'LOW'
      
      const recallImpact = recalledPallets > 0 ? `${recalledPallets} pallets recalled` : 'No recall impact'
      
      return [
        // Ingredient Lot Information
        lot.id,
        lot.supplierLotCode,
        lot.internalLotCode || '',
        lot.Ingredient.name,
        lot.Ingredient.supplierName,
        lot.Ingredient.supplierName,
        lot.supplierLotCode || '',
        '', // purchaseOrder not in schema
        '', // invoiceNumber not in schema
        lot.receivedDate.toISOString().split('T')[0],
        lot.expirationDate?.toISOString().split('T')[0] || '',
        '', // bestByDate not in schema
        lot.manufactureDate?.toISOString().split('T')[0] || '',
        lot.quantityReceived,
        lot.quantityRemaining,
        '', // unitOfMeasure not in schema
        lot.qualityStatus, // using qualityStatus instead of status
        lot.storageLocation || '',
        lot.storageConditions || '', // storageTemp not in schema
        '', // storageHumidity not in schema
        '', // qualityNotes not in schema
        lot.Ingredient.allergens.join('; '),
        lot.Ingredient.certifications.join('; '),
        
        // Usage Information
        usages.length,
        totalQuantityUsed,
        productionRuns.length,
        recipeNames,
        batchNumbers,
        usageDates,
        
        // Forward Traceability - Products Made
        productionRuns.length,
        allPallets.length,
        totalItems,
        shippedPallets,
        inventoryPallets,
        recalledPallets,
        customerOrders,
        shippingDates,
        currentLocations,
        
        // Risk Assessment
        riskLevel,
        riskFactors.join('; '),
        recallImpact,
        lot.Ingredient.allergens.join('; '),
        
        // Audit Trail
        lot.createdAt.toISOString(),
        '', // createdBy not in schema
        lot.updatedAt.toISOString(),
        '', // updatedBy not in schema
      ]
    })
    
    // Convert to CSV format
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    const filename = `traceability-export-${new Date().toISOString().split('T')[0]}.csv`
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
    
  } catch (error) {
    console.error('Error in traceability export:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to export traceability data',
        code: 'EXPORT_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
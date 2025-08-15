import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'
import { 
  searchQuerySchema, 
  paginationSchema,
  QualityStatus,
  type SearchQuery,
  type Pagination
} from '@/lib/validations'

// GET /api/ingredient-lots - List available ingredient lots with stock levels and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const supplier = searchParams.get('supplier') || undefined
    const ingredientId = searchParams.get('ingredientId') || undefined
    const qualityStatus = searchParams.get('qualityStatus') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const showExpired = searchParams.get('showExpired') === 'true'
    const lowStock = searchParams.get('lowStock') === 'true'
    
    // Validate query parameters
    const queryValidation = searchQuerySchema.safeParse({
      search,
      status,
      supplier,
      dateFrom,
      dateTo
    })
    
    const paginationValidation = paginationSchema.safeParse({ page, limit })
    
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: queryValidation.error.flatten()
        },
        { status: 400 }
      )
    }
    
    if (!paginationValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid pagination parameters',
          code: 'VALIDATION_ERROR',
          details: paginationValidation.error.flatten()
        },
        { status: 400 }
      )
    }
    
    const validatedQuery = queryValidation.data
    const validatedPagination = paginationValidation.data
    
    // Build where clause for filtering
    const where: any = {}
    
    if (validatedQuery.search) {
      where.AND = [
        {
          OR: [
            { supplierLotCode: { contains: validatedQuery.search, mode: 'insensitive' } },
            { internalLotCode: { contains: validatedQuery.search, mode: 'insensitive' } },
            { Ingredient: { 
              OR: [
                { name: { contains: validatedQuery.search, mode: 'insensitive' } },
                { supplierName: { contains: validatedQuery.search, mode: 'insensitive' } }
              ]
            } }
          ]
        }
      ]
    }
    
    if (validatedQuery.status) {
      where.qualityStatus = validatedQuery.status
    }
    
    if (validatedQuery.supplier) {
      where.Ingredient = {
        supplierName: { contains: validatedQuery.supplier, mode: 'insensitive' }
      }
    }
    
    if (ingredientId) {
      where.ingredientId = parseInt(ingredientId)
    }
    
    // Validate qualityStatus enum before using it
    if (qualityStatus) {
      const qualityStatusValidation = QualityStatus.safeParse(qualityStatus)
      if (!qualityStatusValidation.success) {
        return NextResponse.json(
          {
            error: 'Invalid quality status',
            code: 'VALIDATION_ERROR',
            details: {
              qualityStatus: `Must be one of: ${QualityStatus.options.join(', ')}`
            }
          },
          { status: 400 }
        )
      }
      where.qualityStatus = qualityStatusValidation.data
    }
    
    if (validatedQuery.dateFrom || validatedQuery.dateTo) {
      where.receivedDate = {}
      if (validatedQuery.dateFrom) {
        where.receivedDate.gte = new Date(validatedQuery.dateFrom)
      }
      if (validatedQuery.dateTo) {
        where.receivedDate.lte = new Date(validatedQuery.dateTo)
      }
    }
    
    // Filter out expired lots unless specifically requested
    if (!showExpired) {
      const expirationFilter = [
        { expirationDate: null },
        { expirationDate: { gt: new Date() } }
      ]
      
      // Merge with existing OR conditions if they exist
      if (where.OR) {
        where.AND = [
          ...(where.AND || []),
          { OR: where.OR },
          { OR: expirationFilter }
        ]
        delete where.OR
      } else {
        where.OR = expirationFilter
      }
    }
    
    // Filter for low stock if requested
    if (lowStock) {
      where.AND = [
        ...(where.AND || []),
        {
          quantityRemaining: {
            gt: 0,
            lte: prisma.$queryRaw`SELECT "minimumStock" FROM "ingredients" WHERE "id" = "IngredientLot"."ingredientId"`
          }
        }
      ]
    }
    
    // Calculate pagination
    const skip = (validatedPagination.page - 1) * validatedPagination.limit
    
    // Execute queries
    const [ingredientLots, total] = await withDatabaseErrorHandling(
      async () => Promise.all([
        prisma.ingredientLot.findMany({
          where,
          include: {
            Ingredient: {
              select: {
                id: true,
                name: true,
                supplierName: true,
                storageType: true,
                allergens: true,
                supplierCode: true
              }
            },
            BatchIngredient: {
              select: {
                id: true,
                quantityUsed: true,
                ProductionRun: {
                  select: {
                    id: true,
                    dailyLot: true,
                    qualityStatus: true
                  }
                }
              }
            }
          },
          orderBy: [
            { qualityStatus: 'asc' },
            { expirationDate: 'asc' },
            { receivedDate: 'desc' }
          ],
          skip,
          take: validatedPagination.limit
        }),
        prisma.ingredientLot.count({ where })
      ]),
      'GET /api/ingredient-lots'
    )
    
    // Calculate additional metrics for each lot
    const enrichedLots = ingredientLots.map(lot => {
      const now = new Date()
      const daysUntilExpiration = lot.expirationDate 
        ? Math.ceil((lot.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null
      
      const isExpired = lot.expirationDate ? lot.expirationDate <= now : false
      const isNearExpiry = daysUntilExpiration !== null && daysUntilExpiration <= 30 && daysUntilExpiration > 0
      const isLowStock = Number(lot.quantityRemaining) <= 10 // Default minimum threshold
      const totalUsed = lot.BatchIngredient.reduce((sum, bi) => sum + Number(bi.quantityUsed), 0)
      const usagePercentage = Number(lot.quantityReceived) > 0 ? (totalUsed / Number(lot.quantityReceived)) * 100 : 0
      
      return {
        ...lot,
        metrics: {
          daysUntilExpiration,
          isExpired,
          isNearExpiry,
          isLowStock,
          totalUsed,
          usagePercentage: Math.round(usagePercentage * 100) / 100,
          remainingPercentage: Math.round(((Number(lot.quantityRemaining) / Number(lot.quantityReceived)) * 100) * 100) / 100
        },
        usageHistory: lot.BatchIngredient.map(bi => ({
          productionRunId: bi.ProductionRun.id,
          dailyLot: bi.ProductionRun.dailyLot,
          quantityUsed: bi.quantityUsed,
          qualityStatus: bi.ProductionRun.qualityStatus
        }))
      }
    })
    
    // Calculate summary statistics
    const summary = {
      total,
      active: ingredientLots.filter(lot => lot.qualityStatus === 'passed').length,
      expired: ingredientLots.filter(lot => {
        const now = new Date()
        return lot.expirationDate && lot.expirationDate <= now
      }).length,
      nearExpiry: ingredientLots.filter(lot => {
        if (!lot.expirationDate) return false
        const now = new Date()
        const daysUntil = Math.ceil((lot.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return daysUntil <= 30 && daysUntil > 0
      }).length,
      lowStock: ingredientLots.filter(lot => Number(lot.quantityRemaining) <= 10).length,
      qualityPending: ingredientLots.filter(lot => lot.qualityStatus === 'pending').length,
      qualityFailed: ingredientLots.filter(lot => lot.qualityStatus === 'failed').length
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedPagination.limit)
    const hasNextPage = validatedPagination.page < totalPages
    const hasPreviousPage = validatedPagination.page > 1
    
    return NextResponse.json({
      data: enrichedLots,
      summary,
      pagination: {
        page: validatedPagination.page,
        limit: validatedPagination.limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })
    
  } catch (error) {
    console.error('Error fetching ingredient lots:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch ingredient lots',
        code: 'FETCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { 
  getProductionRunsOptimized,
  getRecipeByIdOptimized,
  measureQueryPerformance
} from '@/lib/services/production-runs-optimized'
import { withOptimizedDatabaseOperation, prisma } from '@/lib/db-optimized'
import { 
  createProductionRunSchema, 
  searchQuerySchema, 
  paginationSchema,
  type CreateProductionRunInput
} from '@/lib/validations'

// Add response caching headers for better performance
function addCacheHeaders(response: NextResponse, maxAge: number = 60): NextResponse {
  response.headers.set('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`)
  response.headers.set('CDN-Cache-Control', `public, s-maxage=${maxAge * 2}`)
  return response
}

// GET /api/production-runs-optimized - Optimized endpoint with caching and performance monitoring
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Cap at 100

    // Validate inputs
    const queryValidation = searchQuerySchema.safeParse({
      search, status, dateFrom, dateTo
    })
    
    const paginationValidation = paginationSchema.safeParse({ page, limit })
    
    if (!queryValidation.success || !paginationValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid parameters',
          code: 'VALIDATION_ERROR',
          details: {
            query: queryValidation.success ? null : queryValidation.error.flatten(),
            pagination: paginationValidation.success ? null : paginationValidation.error.flatten()
          }
        },
        { status: 400 }
      )
    }

    // Execute optimized query with performance monitoring
    const { result, duration } = await measureQueryPerformance(
      () => getProductionRunsOptimized({
        search,
        status,
        dateFrom,
        dateTo,
        page: paginationValidation.data.page,
        limit: paginationValidation.data.limit
      }),
      'getProductionRunsOptimized'
    )

    // Add performance headers for monitoring
    const response = NextResponse.json({
      ...result,
      meta: {
        queryTime: `${duration.toFixed(2)}ms`,
        cached: true, // React.cache automatically handles memoization
        timestamp: new Date().toISOString()
      }
    })

    // Add caching headers (shorter cache for dynamic data)
    return addCacheHeaders(response, 30) // 30 second cache with 60 second stale-while-revalidate
    
  } catch (error) {
    console.error('Error in optimized production runs endpoint:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch production runs',
        code: 'FETCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/production-runs-optimized - Optimized creation with better validation and performance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = createProductionRunSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten()
        },
        { status: 400 }
      )
    }
    
    const data: CreateProductionRunInput = validation.data

    // Optimized recipe validation using cached service
    const { result: recipe, duration: recipeLookupTime } = await measureQueryPerformance(
      () => getRecipeByIdOptimized(data.recipeId),
      'getRecipeByIdOptimized'
    )
    
    if (!recipe) {
      return NextResponse.json(
        {
          error: 'Recipe not found',
          code: 'RECIPE_NOT_FOUND',
          details: { recipeId: data.recipeId }
        },
        { status: 404 }
      )
    }
    
    if (!recipe.isActive) {
      return NextResponse.json(
        {
          error: 'Cannot create production run for inactive recipe',
          code: 'RECIPE_INACTIVE',
          details: { recipeId: data.recipeId, recipeName: recipe.name }
        },
        { status: 400 }
      )
    }

    // Optimized creation with transaction for data consistency
    const { result: productionRun, duration: createTime } = await measureQueryPerformance(
      () => withOptimizedDatabaseOperation(
        async () => {
          // Use transaction for consistency
          return prisma.$transaction(async (tx) => {
            // Check for duplicate daily lot within transaction
            const existingBatch = await tx.productionRun.findFirst({
              where: { dailyLot: data.dailyLot },
              select: { id: true, dailyLot: true }
            })
            
            if (existingBatch) {
              throw new Error(`Daily lot ${data.dailyLot} already exists`)
            }

            // Create production run
            return tx.productionRun.create({
              data: {
                dailyLot: data.dailyLot,
                cakeLot: data.cakeLot,
                icingLot: data.icingLot,
                plannedQuantity: data.plannedQuantity,
                recipeId: data.recipeId,
                startTime: data.startTime ? new Date(data.startTime) : null,
                primaryOperatorId: data.primaryOperatorId,
                assistantOperatorId: data.assistantOperatorId,
                inspectorId: data.inspectorId,
                equipmentStation: data.equipmentStation,
                notes: data.notes,
                qualityStatus: 'pending'
              },
              include: {
                Recipe: {
                  select: {
                    id: true,
                    name: true,
                    version: true,
                    yieldQuantity: true,
                    yieldUnit: true
                  }
                }
              }
            })
          })
        },
        'optimized-production-run-creation'
      ),
      'createProductionRunTransaction'
    )

    return NextResponse.json({
      ...productionRun,
      meta: {
        recipeLookupTime: `${recipeLookupTime.toFixed(2)}ms`,
        createTime: `${createTime.toFixed(2)}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating production run (optimized):', error)
    
    // Handle duplicate daily lot error specifically
    if (error instanceof Error && error.message.includes('already exists')) {
      const dailyLotMatch = error.message.match(/Daily lot (.+) already exists/)
      const dailyLot = dailyLotMatch ? dailyLotMatch[1] : 'unknown'
      
      return NextResponse.json(
        {
          error: 'Daily lot already exists',
          code: 'DUPLICATE_DAILY_LOT',
          details: { dailyLot }
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      {
        error: 'Failed to create production run',
        code: 'CREATE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
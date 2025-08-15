import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'
import { 
  createProductionRunSchema, 
  searchQuerySchema, 
  paginationSchema,
  type CreateProductionRunInput,
  type SearchQuery,
  type Pagination
} from '@/lib/validations'

// GET /api/production-runs - List production runs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Validate query parameters
    const queryValidation = searchQuerySchema.safeParse({
      search,
      status,
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
      where.OR = [
        { dailyLot: { contains: validatedQuery.search, mode: 'insensitive' } },
        { cakeLot: { contains: validatedQuery.search, mode: 'insensitive' } },
        { icingLot: { contains: validatedQuery.search, mode: 'insensitive' } },
        { equipmentStation: { contains: validatedQuery.search, mode: 'insensitive' } },
        { notes: { contains: validatedQuery.search, mode: 'insensitive' } }
      ]
    }
    
    if (validatedQuery.status) {
      where.qualityStatus = validatedQuery.status
    }
    
    if (validatedQuery.dateFrom || validatedQuery.dateTo) {
      where.createdAt = {}
      if (validatedQuery.dateFrom) {
        where.createdAt.gte = new Date(validatedQuery.dateFrom)
      }
      if (validatedQuery.dateTo) {
        where.createdAt.lte = new Date(validatedQuery.dateTo)
      }
    }
    
    // Calculate pagination
    const skip = (validatedPagination.page - 1) * validatedPagination.limit
    
    // Execute queries - OPTIMIZED: Simplified query to prevent timeouts
    const [productionRuns, total] = await withDatabaseErrorHandling(
      async () => Promise.all([
        prisma.productionRun.findMany({
          where,
          include: {
            Recipe: {
              select: {
                id: true,
                name: true,
                yieldQuantity: true,
                yieldUnit: true
              }
            }
            // Note: Removed complex nested includes (Pallet, BatchIngredient) to prevent timeouts
            // These can be fetched separately if needed for detailed views
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: validatedPagination.limit
        }),
        prisma.productionRun.count({ where })
      ]),
      'GET /api/production-runs'
    )
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedPagination.limit)
    const hasNextPage = validatedPagination.page < totalPages
    const hasPreviousPage = validatedPagination.page > 1
    
    return NextResponse.json({
      data: productionRuns,
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
    console.error('Error fetching production runs:', error)
    
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

// POST /api/production-runs - Create new production run
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
    
    // Check if recipe exists
    const recipe = await withDatabaseErrorHandling(
      async () => prisma.recipe.findUnique({
        where: { id: data.recipeId },
        select: { id: true, name: true, isActive: true }
      }),
      'Recipe lookup for production run creation'
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
    
    // Check for duplicate daily lot (assuming daily lot should be unique)
    const existingBatch = await withDatabaseErrorHandling(
      async () => prisma.productionRun.findFirst({
        where: { dailyLot: data.dailyLot },
        select: { id: true, dailyLot: true }
      }),
      'Daily lot uniqueness check'
    )
    
    if (existingBatch) {
      return NextResponse.json(
        {
          error: 'Daily lot already exists',
          code: 'DUPLICATE_DAILY_LOT',
          details: { dailyLot: data.dailyLot }
        },
        { status: 409 }
      )
    }
    
    // Create the production run
    const productionRun = await withDatabaseErrorHandling(
      async () => prisma.productionRun.create({
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
          Recipe: true
        }
      }),
      'Production run creation'
    )
    
    return NextResponse.json(productionRun, { status: 201 })
    
  } catch (error) {
    console.error('Error creating production run:', error)
    
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
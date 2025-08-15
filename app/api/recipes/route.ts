import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling, DatabaseError } from '@/lib/db'
import { createRecipeSchema, searchQuerySchema, paginationSchema } from '@/lib/validations'
import { ZodError } from 'zod'

// GET /api/recipes - List recipes for production run creation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const search = searchParams.get('search') || undefined
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50') // Higher default for production forms
    
    // Validate query parameters
    const queryValidation = searchQuerySchema.safeParse({ search })
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
        { name: { contains: validatedQuery.search, mode: 'insensitive' } },
        { description: { contains: validatedQuery.search, mode: 'insensitive' } },
        { version: { contains: validatedQuery.search, mode: 'insensitive' } }
      ]
    }
    
    // Default to only active recipes unless specifically requested
    if (isActive !== 'false') {
      where.isActive = true
    } else if (isActive === 'false') {
      where.isActive = false
    }
    
    // Calculate pagination
    const skip = (validatedPagination.page - 1) * validatedPagination.limit

    const [recipes, total] = await withDatabaseErrorHandling(
      async () => Promise.all([
        prisma.recipe.findMany({
          where,
          include: {
            ProductionRun: {
              select: {
                id: true,
                dailyLot: true,
                qualityStatus: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 5 // Show last 5 production runs
            },
            _count: {
              select: {
                ProductionRun: true
              }
            }
          },
          orderBy: [
            { isActive: 'desc' },
            { name: 'asc' }
          ],
          skip,
          take: validatedPagination.limit
        }),
        prisma.recipe.count({ where })
      ]),
      'GET /api/recipes'
    )

    // Enrich recipes with calculated fields
    const enrichedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      version: recipe.version,
      isActive: recipe.isActive,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      createdBy: recipe.createdBy,
      updatedBy: recipe.updatedBy,
      // Additional calculated fields
      totalProductionRuns: recipe._count.ProductionRun,
      recentProductionRuns: recipe.ProductionRun,
      lastUsed: recipe.ProductionRun.length > 0 ? recipe.ProductionRun[0].createdAt : null
    }))
    
    // Calculate summary statistics
    const summary = {
      total,
      active: recipes.filter(recipe => recipe.isActive).length,
      inactive: recipes.filter(recipe => !recipe.isActive).length,
      recentlyUsed: recipes.filter(recipe => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return recipe.ProductionRun.some(run => run.createdAt >= thirtyDaysAgo)
      }).length
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedPagination.limit)
    const hasNextPage = validatedPagination.page < totalPages
    const hasPreviousPage = validatedPagination.page > 1

    return NextResponse.json({
      data: enrichedRecipes,
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
    console.error('Error in GET /api/recipes:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = createRecipeSchema.safeParse(body)
    
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
    
    const validatedData = validation.data

    const recipe = await withDatabaseErrorHandling(
      async () => {
        return await prisma.recipe.create({
          data: {
            name: validatedData.name,
            description: validatedData.description,
            version: validatedData.version,
            isActive: validatedData.isActive,
            yieldQuantity: validatedData.yieldQuantity,
            yieldUnit: validatedData.yieldUnit,
            createdBy: validatedData.createdBy || null // Use provided user ID or null for system
          }
        })
      },
      'creating recipe'
    )

    return NextResponse.json(
      {
        recipe: {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          version: recipe.version,
          isActive: recipe.isActive,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt,
          createdBy: recipe.createdBy
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/recipes:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'DATABASE_ERROR'
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
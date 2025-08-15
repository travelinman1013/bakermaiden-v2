import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling, DatabaseError } from '@/lib/db'
import { createIngredientSchema, searchQuerySchema, paginationSchema } from '@/lib/validations'
import { ZodError } from 'zod'

// GET /api/ingredients - List all ingredients with enhanced filtering for production forms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') || 'ACTIVE' // Default to active ingredients
    const type = searchParams.get('type') || undefined
    const supplier = searchParams.get('supplier') || undefined
    const lowStock = searchParams.get('lowStock') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50') // Higher default for production forms
    
    // Validate query parameters
    const queryValidation = searchQuerySchema.safeParse({
      search,
      status,
      type,
      supplier
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
        { name: { contains: validatedQuery.search, mode: 'insensitive' } },
        { supplierName: { contains: validatedQuery.search, mode: 'insensitive' } },
        { supplierCode: { contains: validatedQuery.search, mode: 'insensitive' } }
      ]
    }
    
    if (validatedQuery.status) {
      // Map status filter to isActive boolean field
      where.isActive = validatedQuery.status === 'ACTIVE'
    }
    
    if (validatedQuery.type) {
      where.storageType = validatedQuery.type
    }
    
    if (validatedQuery.supplier) {
      where.supplierName = { contains: validatedQuery.supplier, mode: 'insensitive' }
    }
    
    // Note: Low stock filtering removed as current schema doesn't have stock fields
    // This feature can be added when inventory management fields are included in schema
    
    // Calculate pagination
    const skip = (validatedPagination.page - 1) * validatedPagination.limit
    
    const [ingredients, total] = await withDatabaseErrorHandling(
      async () => Promise.all([
        prisma.ingredient.findMany({
          where,
          include: {
            IngredientLot: {
              where: {
                qualityStatus: 'passed',
                quantityRemaining: { gt: 0 }
              },
              select: {
                id: true,
                internalLotCode: true,
                quantityRemaining: true,
                expirationDate: true,
                qualityStatus: true
              },
              orderBy: { expirationDate: 'asc' }
            },
            _count: {
              select: {
                IngredientLot: true
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
        prisma.ingredient.count({ where })
      ]),
      'GET /api/ingredients'
    )

    // Enrich ingredients with calculated fields
    const enrichedIngredients = ingredients.map(ingredient => {
      const totalAvailableStock = ingredient.IngredientLot.reduce((sum, lot) => sum + Number(lot.quantityRemaining), 0)
      const hasAvailableLots = ingredient.IngredientLot.length > 0
      const nearExpiryLots = ingredient.IngredientLot.filter(lot => {
        if (!lot.expirationDate) return false
        const daysUntilExpiry = Math.ceil((lot.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0
      }).length

      return {
        id: ingredient.id,
        name: ingredient.name,
        supplierName: ingredient.supplierName,
        supplierCode: ingredient.supplierCode,
        storageType: ingredient.storageType,
        shelfLifeDays: ingredient.shelfLifeDays,
        allergens: ingredient.allergens,
        certifications: ingredient.certifications,
        isActive: ingredient.isActive,
        createdAt: ingredient.createdAt,
        updatedAt: ingredient.updatedAt,
        // Additional calculated fields
        totalAvailableStock,
        hasAvailableLots,
        nearExpiryLots,
        lotCount: ingredient._count.IngredientLot,
        availableLots: ingredient.IngredientLot.map(lot => ({
          id: lot.id,
          lotCode: lot.internalLotCode,
          quantityRemaining: lot.quantityRemaining,
          expirationDate: lot.expirationDate,
          qualityStatus: lot.qualityStatus
        }))
      }
    })
    
    // Calculate summary statistics
    const summary = {
      total,
      active: ingredients.filter(ing => ing.isActive === true).length,
      withAvailableLots: ingredients.filter(ing => ing.IngredientLot.length > 0).length,
      byStorageType: ingredients.reduce((acc, ing) => {
        acc[ing.storageType] = (acc[ing.storageType] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validatedPagination.limit)
    const hasNextPage = validatedPagination.page < totalPages
    const hasPreviousPage = validatedPagination.page > 1

    return NextResponse.json({
      data: enrichedIngredients,
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
    console.error('Error in GET /api/ingredients:', error)

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

// POST /api/ingredients - Create a new ingredient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = createIngredientSchema.safeParse(body)
    
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

    const ingredient = await withDatabaseErrorHandling(
      async () => {
        return await prisma.ingredient.create({
          data: {
            name: validatedData.name,
            supplierName: validatedData.supplierName,
            supplierCode: validatedData.supplierCode,
            storageType: validatedData.storageType || 'dry',
            shelfLifeDays: validatedData.shelfLifeDays,
            allergens: validatedData.allergens || [],
            certifications: validatedData.certifications || [],
            isActive: validatedData.isActive ?? true
          }
        })
      },
      'creating ingredient'
    )

    return NextResponse.json(
      {
        ingredient: {
          id: ingredient.id,
          name: ingredient.name,
          supplierName: ingredient.supplierName,
          supplierCode: ingredient.supplierCode,
          storageType: ingredient.storageType,
          shelfLifeDays: ingredient.shelfLifeDays,
          allergens: ingredient.allergens,
          certifications: ingredient.certifications,
          isActive: ingredient.isActive,
          createdAt: ingredient.createdAt,
          updatedAt: ingredient.updatedAt
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/ingredients:', error)

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
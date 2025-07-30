import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling, DatabaseError } from '@/lib/db'
import { createIngredientSchema, searchQuerySchema } from '@/lib/validations'
import { ZodError } from 'zod'

// GET /api/ingredients - List all ingredients with optional search
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const searchQuery = searchParams.get('search')

  try {
    // Validate query parameters
    const { search } = searchQuerySchema.parse({ search: searchQuery })

    const ingredients = await withDatabaseErrorHandling(
      async () => {
        return await prisma.ingredient.findMany({
          where: search
            ? {
                name: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            : undefined,
          orderBy: {
            name: 'asc'
          },
          include: {
            _count: {
              select: {
                recipeIngredients: true
              }
            }
          }
        })
      },
      'fetching ingredients'
    )

    return NextResponse.json({
      ingredients: ingredients.map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: Number(ingredient.currentStock),
        createdAt: ingredient.createdAt,
        updatedAt: ingredient.updatedAt,
        usedInRecipes: ingredient._count.recipeIngredients
      }))
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
    const validatedData = createIngredientSchema.parse(body)

    const ingredient = await withDatabaseErrorHandling(
      async () => {
        return await prisma.ingredient.create({
          data: {
            name: validatedData.name,
            unit: validatedData.unit,
            currentStock: validatedData.currentStock
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
          unit: ingredient.unit,
          currentStock: Number(ingredient.currentStock),
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
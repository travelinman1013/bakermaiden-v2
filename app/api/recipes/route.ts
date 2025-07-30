import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling, DatabaseError } from '@/lib/db'
import { createRecipeSchema, searchQuerySchema } from '@/lib/validations'
import { ZodError } from 'zod'

// GET /api/recipes - List all recipes with optional search
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const searchQuery = searchParams.get('search')

  try {
    // Validate query parameters
    const { search } = searchQuerySchema.parse({ search: searchQuery })

    const recipes = await withDatabaseErrorHandling(
      async () => {
        return await prisma.recipe.findMany({
          where: search
            ? {
                name: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            : undefined,
          orderBy: {
            createdAt: 'desc'
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
      'fetching recipes'
    )

    return NextResponse.json({
      recipes: recipes.map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        servings: recipe.servings,
        prepTime: recipe.prepTime,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
        ingredientCount: recipe._count.recipeIngredients
      }))
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
    const validatedData = createRecipeSchema.parse(body)

    const recipe = await withDatabaseErrorHandling(
      async () => {
        return await prisma.recipe.create({
          data: {
            name: validatedData.name,
            description: validatedData.description || null,
            servings: validatedData.servings || null,
            prepTime: validatedData.prepTime || null
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
          servings: recipe.servings,
          prepTime: recipe.prepTime,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt
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
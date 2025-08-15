import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling, DatabaseError } from '@/lib/db'
import { updateRecipeSchema, recipeIdSchema } from '@/lib/validations'
import { ZodError } from 'zod'

// GET /api/recipes/[id] - Get a specific recipe with ingredients
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate recipe ID
    const { id: idString } = recipeIdSchema.parse({ id: params.id })
    const id = parseInt(idString, 10)
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          error: 'Invalid recipe ID',
          code: 'INVALID_ID'
        },
        { status: 400 }
      )
    }

    const recipe = await withDatabaseErrorHandling(
      async () => {
        return await prisma.recipe.findUnique({
          where: { id }
        })
      },
      'fetching recipe'
    )

    if (!recipe) {
      return NextResponse.json(
        {
          error: 'Recipe not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        version: recipe.version,
        isActive: recipe.isActive,
        yieldQuantity: recipe.yieldQuantity ? Number(recipe.yieldQuantity) : null,
        yieldUnit: recipe.yieldUnit,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt
      }
    })
  } catch (error) {
    console.error('Error in GET /api/recipes/[id]:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid recipe ID',
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

// PUT /api/recipes/[id] - Update a specific recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate recipe ID
    const { id: idString } = recipeIdSchema.parse({ id: params.id })
    const id = parseInt(idString, 10)
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          error: 'Invalid recipe ID',
          code: 'INVALID_ID'
        },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    // Validate request body
    const validatedData = updateRecipeSchema.parse(body)

    // Check if recipe exists and update
    const recipe = await withDatabaseErrorHandling(
      async () => {
        // First check if recipe exists
        const existingRecipe = await prisma.recipe.findUnique({
          where: { id }
        })

        if (!existingRecipe) {
          throw new DatabaseError('Recipe not found')
        }

        // Update the recipe
        return await prisma.recipe.update({
          where: { id },
          data: {
            ...(validatedData.name && { name: validatedData.name }),
            ...(validatedData.description !== undefined && { 
              description: validatedData.description 
            }),
            ...(validatedData.version !== undefined && { version: validatedData.version }),
            ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
            ...(validatedData.yieldQuantity !== undefined && { yieldQuantity: validatedData.yieldQuantity }),
            ...(validatedData.yieldUnit !== undefined && { yieldUnit: validatedData.yieldUnit })
          }
        })
      },
      'updating recipe'
    )

    return NextResponse.json({
      recipe: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        version: recipe.version,
        isActive: recipe.isActive,
        yieldQuantity: recipe.yieldQuantity ? Number(recipe.yieldQuantity) : null,
        yieldUnit: recipe.yieldUnit,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt
      }
    })
  } catch (error) {
    console.error('Error in PUT /api/recipes/[id]:', error)

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
      const status = error.message === 'Recipe not found' ? 404 : 500
      return NextResponse.json(
        {
          error: error.message,
          code: error.message === 'Recipe not found' ? 'NOT_FOUND' : 'DATABASE_ERROR'
        },
        { status }
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

// DELETE /api/recipes/[id] - Delete a specific recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate recipe ID
    const { id: idString } = recipeIdSchema.parse({ id: params.id })
    const id = parseInt(idString, 10)
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          error: 'Invalid recipe ID',
          code: 'INVALID_ID'
        },
        { status: 400 }
      )
    }

    await withDatabaseErrorHandling(
      async () => {
        // First check if recipe exists
        const existingRecipe = await prisma.recipe.findUnique({
          where: { id }
        })

        if (!existingRecipe) {
          throw new DatabaseError('Recipe not found')
        }

        // Delete the recipe (cascade will handle recipe_ingredients)
        await prisma.recipe.delete({
          where: { id }
        })
      },
      'deleting recipe'
    )

    return NextResponse.json({
      success: true,
      message: 'Recipe deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/recipes/[id]:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid recipe ID',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }

    if (error instanceof DatabaseError) {
      const status = error.message === 'Recipe not found' ? 404 : 500
      return NextResponse.json(
        {
          error: error.message,
          code: error.message === 'Recipe not found' ? 'NOT_FOUND' : 'DATABASE_ERROR'
        },
        { status }
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
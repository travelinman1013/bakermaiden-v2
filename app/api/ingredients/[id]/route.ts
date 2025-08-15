import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling, DatabaseError } from '@/lib/db'
import { updateIngredientSchema, ingredientIdSchema } from '@/lib/validations'
import { ZodError } from 'zod'

// GET /api/ingredients/[id] - Get a specific ingredient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate ingredient ID
    const { id } = ingredientIdSchema.parse({ id: params.id })
    const ingredientId = parseInt(id, 10)

    const ingredient = await withDatabaseErrorHandling(
      async () => {
        return await prisma.ingredient.findUnique({
          where: { id: ingredientId },
          include: {
            IngredientLot: true
          }
        })
      },
      'fetching ingredient'
    )

    if (!ingredient) {
      return NextResponse.json(
        {
          error: 'Ingredient not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
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
        updatedAt: ingredient.updatedAt,
        lots: ingredient.IngredientLot
      }
    })
  } catch (error) {
    console.error('Error in GET /api/ingredients/[id]:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid ingredient ID',
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

// PUT /api/ingredients/[id] - Update a specific ingredient
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate ingredient ID
    const { id } = ingredientIdSchema.parse({ id: params.id })
    const ingredientId = parseInt(id, 10)
    
    const body = await request.json()
    
    // Validate request body
    const validatedData = updateIngredientSchema.parse(body)

    // Check if ingredient exists and update
    const ingredient = await withDatabaseErrorHandling(
      async () => {
        // First check if ingredient exists
        const existingIngredient = await prisma.ingredient.findUnique({
          where: { id: ingredientId }
        })

        if (!existingIngredient) {
          throw new DatabaseError('Ingredient not found')
        }

        // Update the ingredient
        return await prisma.ingredient.update({
          where: { id: ingredientId },
          data: {
            ...(validatedData.name && { name: validatedData.name }),
            ...(validatedData.description !== undefined && { description: validatedData.description }),
            ...(validatedData.supplierCode !== undefined && { supplierCode: validatedData.supplierCode }),
            updatedAt: new Date()
          }
        })
      },
      'updating ingredient'
    )

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error('Error in PUT /api/ingredients/[id]:', error)

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
      const status = error.message === 'Ingredient not found' ? 404 : 500
      return NextResponse.json(
        {
          error: error.message,
          code: error.message === 'Ingredient not found' ? 'NOT_FOUND' : 'DATABASE_ERROR'
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

// DELETE /api/ingredients/[id] - Delete a specific ingredient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate ingredient ID
    const { id } = ingredientIdSchema.parse({ id: params.id })
    const ingredientId = parseInt(id, 10)

    const result = await withDatabaseErrorHandling(
      async () => {
        // First check if ingredient exists and count recipe usage
        const existingIngredient = await prisma.ingredient.findUnique({
          where: { id: ingredientId },
          include: {
            _count: {
              select: {
                IngredientLot: true
              }
            }
          }
        })

        if (!existingIngredient) {
          throw new DatabaseError('Ingredient not found')
        }

        // Check if ingredient has any lots
        if (existingIngredient._count.IngredientLot > 0) {
          throw new DatabaseError(
            `Cannot delete ingredient "${existingIngredient.name}" because it has ${existingIngredient._count.IngredientLot} lot(s). Remove all lots first.`
          )
        }

        // Delete the ingredient
        await prisma.ingredient.delete({
          where: { id: ingredientId }
        })

        return { name: existingIngredient.name }
      },
      'deleting ingredient'
    )

    return NextResponse.json({
      success: true,
      message: `Ingredient "${result.name}" deleted successfully`
    })
  } catch (error) {
    console.error('Error in DELETE /api/ingredients/[id]:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid ingredient ID',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }

    if (error instanceof DatabaseError) {
      let status = 500
      let code = 'DATABASE_ERROR'
      
      if (error.message === 'Ingredient not found') {
        status = 404
        code = 'NOT_FOUND'
      } else if (error.message.includes('Cannot delete ingredient')) {
        status = 409
        code = 'CONFLICT'
      }
      
      return NextResponse.json(
        {
          error: error.message,
          code
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
import { NextRequest, NextResponse } from 'next/server'
import { prisma, withDatabaseErrorHandling } from '@/lib/db'
import { 
  updateProductionRunSchema,
  type UpdateProductionRunInput
} from '@/lib/validations'
import { 
  transformProductionRunResponse, 
  validateProductionRunResponse 
} from '@/lib/data-transforms'
import type { 
  ProductionRunWithRelations, 
  ApiErrorResponse, 
  ProductionRunDetail 
} from '@/lib/types'

// GET /api/production-runs/[id] - Get specific production run details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          error: 'Invalid production run ID',
          code: 'INVALID_ID',
          details: { id: params.id }
        },
        { status: 400 }
      )
    }
    
    const rawProductionRun = await withDatabaseErrorHandling(
      async () => prisma.productionRun.findUnique({
        where: { id },
        include: {
          Recipe: true,
          Pallet: {
            orderBy: { createdAt: 'asc' }
          },
          BatchIngredient: {
            include: {
              IngredientLot: {
                include: {
                  Ingredient: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      }),
      `GET /api/production-runs/${id}`
    )
    
    if (!rawProductionRun) {
      const errorResponse: ApiErrorResponse = {
        error: 'Production run not found',
        code: 'NOT_FOUND',
        details: { id }
      };
      return NextResponse.json(errorResponse, { status: 404 })
    }
    
    // Validate and transform the response for frontend consumption
    if (!validateProductionRunResponse(rawProductionRun)) {
      console.error('Invalid production run data structure:', rawProductionRun);
      const errorResponse: ApiErrorResponse = {
        error: 'Invalid production run data structure',
        code: 'DATA_STRUCTURE_ERROR',
        details: { id, missingFields: 'Recipe or array relationships' }
      };
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
    try {
      const transformedData: ProductionRunDetail = transformProductionRunResponse(
        rawProductionRun as ProductionRunWithRelations
      );
      
      return NextResponse.json(transformedData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (transformError) {
      console.error('Error transforming production run data:', transformError);
      const errorResponse: ApiErrorResponse = {
        error: 'Failed to transform production run data',
        code: 'TRANSFORMATION_ERROR',
        details: { id, error: transformError instanceof Error ? transformError.message : 'Unknown error' }
      };
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
  } catch (error) {
    console.error(`Error fetching production run ${params.id}:`, error)
    
    return NextResponse.json(
      {
        error: 'Failed to fetch production run',
        code: 'FETCH_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/production-runs/[id] - Update production run status/data
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          error: 'Invalid production run ID',
          code: 'INVALID_ID',
          details: { id: params.id }
        },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    // Validate request body
    const validation = updateProductionRunSchema.safeParse(body)
    
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
    
    const data: UpdateProductionRunInput = validation.data
    
    // Check if production run exists
    const existingRun = await withDatabaseErrorHandling(
      async () => prisma.productionRun.findUnique({
        where: { id },
        select: { 
          id: true, 
          dailyLot: true, 
          qualityStatus: true,
          startTime: true,
          endTime: true
        }
      }),
      'Production run existence check'
    )
    
    if (!existingRun) {
      return NextResponse.json(
        {
          error: 'Production run not found',
          code: 'NOT_FOUND',
          details: { id }
        },
        { status: 404 }
      )
    }
    
    // Prevent updates to completed or recalled batches (except for quality updates)
    if (existingRun.qualityStatus === 'passed') {
      const allowedFields = ['qualityStatus']
      const updateFields = Object.keys(data)
      const hasDisallowedUpdates = updateFields.some(field => !allowedFields.includes(field))
      
      if (hasDisallowedUpdates) {
        return NextResponse.json(
          {
            error: `Cannot update production run with quality status: ${existingRun.qualityStatus}`,
            code: 'UPDATE_FORBIDDEN',
            details: { 
              qualityStatus: existingRun.qualityStatus,
              allowedFields: allowedFields,
              attemptedFields: updateFields
            }
          },
          { status: 403 }
        )
      }
    }
    
    // Calculate duration if start and end times are provided
    let calculatedDuration: number | undefined
    if (data.startTime && data.endTime) {
      const startTime = new Date(data.startTime)
      const endTime = new Date(data.endTime)
      
      if (endTime <= startTime) {
        return NextResponse.json(
          {
            error: 'End time must be after start time',
            code: 'INVALID_TIME_RANGE',
            details: { 
              startTime: data.startTime, 
              endTime: data.endTime 
            }
          },
          { status: 400 }
        )
      }
      
      calculatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    } else if (data.startTime && existingRun.endTime) {
      const startTime = new Date(data.startTime)
      const endTime = existingRun.endTime
      calculatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    } else if (data.endTime && existingRun.startTime) {
      const startTime = existingRun.startTime
      const endTime = new Date(data.endTime)
      calculatedDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    }
    
    // Prepare update data
    const updateData: any = {
      ...data,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    }
    
    // Note: duration will be calculated from startTime and endTime on the frontend
    // The database doesn't store a separate durationMinutes field
    
    // Update the production run
    const rawUpdatedRun = await withDatabaseErrorHandling(
      async () => prisma.productionRun.update({
        where: { id },
        data: updateData,
        include: {
          Recipe: true,
          Pallet: {
            orderBy: { createdAt: 'asc' }
          },
          BatchIngredient: {
            include: {
              IngredientLot: {
                include: {
                  Ingredient: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      }),
      `Production run update for ID ${id}`
    )
    
    // Transform the updated data for consistent response format
    if (!validateProductionRunResponse(rawUpdatedRun)) {
      console.error('Invalid updated production run data structure:', rawUpdatedRun);
      const errorResponse: ApiErrorResponse = {
        error: 'Invalid updated production run data structure',
        code: 'UPDATE_DATA_ERROR',
        details: { id }
      };
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
    try {
      const transformedUpdatedData: ProductionRunDetail = transformProductionRunResponse(
        rawUpdatedRun as ProductionRunWithRelations
      );
      
      return NextResponse.json(transformedUpdatedData, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (transformError) {
      console.error('Error transforming updated production run data:', transformError);
      const errorResponse: ApiErrorResponse = {
        error: 'Failed to transform updated production run data',
        code: 'UPDATE_TRANSFORMATION_ERROR',
        details: { id, error: transformError instanceof Error ? transformError.message : 'Unknown error' }
      };
      return NextResponse.json(errorResponse, { status: 500 })
    }
    
  } catch (error) {
    console.error(`Error updating production run ${params.id}:`, error)
    
    return NextResponse.json(
      {
        error: 'Failed to update production run',
        code: 'UPDATE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/production-runs/[id] - Archive production run (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          error: 'Invalid production run ID',
          code: 'INVALID_ID',
          details: { id: params.id }
        },
        { status: 400 }
      )
    }
    
    // Check if production run exists and get its status
    const existingRun = await withDatabaseErrorHandling(
      async () => prisma.productionRun.findUnique({
        where: { id },
        select: { 
          id: true, 
          dailyLot: true, 
          qualityStatus: true,
          notes: true,
          Pallet: {
            select: { id: true, shippingStatus: true }
          }
        }
      }),
      'Production run existence check for deletion'
    )
    
    if (!existingRun) {
      return NextResponse.json(
        {
          error: 'Production run not found',
          code: 'NOT_FOUND',
          details: { id }
        },
        { status: 404 }
      )
    }
    
    // Prevent deletion of completed runs or runs with shipped pallets
    if (existingRun.qualityStatus === 'passed') {
      return NextResponse.json(
        {
          error: 'Cannot delete completed production run',
          code: 'DELETE_FORBIDDEN',
          details: { 
            qualityStatus: existingRun.qualityStatus,
            dailyLot: existingRun.dailyLot
          }
        },
        { status: 403 }
      )
    }
    
    const hasShippedPallets = existingRun.Pallet.some(pallet => pallet.shippingStatus === 'shipped')
    if (hasShippedPallets) {
      return NextResponse.json(
        {
          error: 'Cannot delete production run with shipped pallets',
          code: 'DELETE_FORBIDDEN',
          details: { 
            dailyLot: existingRun.dailyLot,
            shippedPallets: existingRun.Pallet.filter(p => p.shippingStatus === 'shipped').length
          }
        },
        { status: 403 }
      )
    }
    
    // For MVP, we'll do a soft delete by marking as FAILED
    // In production, consider adding a 'deleted' boolean field or archived status
    const archivedRun = await withDatabaseErrorHandling(
      async () => prisma.productionRun.update({
        where: { id },
        data: {
          qualityStatus: 'failed',
          notes: existingRun.notes 
            ? `${existingRun.notes}\n\n[ARCHIVED: ${new Date().toISOString()}]`
            : `[ARCHIVED: ${new Date().toISOString()}]`,
        },
        select: {
          id: true,
          dailyLot: true,
          qualityStatus: true,
          updatedAt: true
        }
      }),
      `Production run archival for ID ${id}`
    )
    
    return NextResponse.json({
      message: 'Production run archived successfully',
      data: archivedRun
    })
    
  } catch (error) {
    console.error(`Error deleting production run ${params.id}:`, error)
    
    return NextResponse.json(
      {
        error: 'Failed to archive production run',
        code: 'DELETE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
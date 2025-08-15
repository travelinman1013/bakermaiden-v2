import { NextRequest, NextResponse } from 'next/server'
import { 
  getProductionRunByIdOptimized,
  measureQueryPerformance
} from '@/lib/services/production-runs-optimized'

// Add response caching headers for individual production runs (longer cache)
function addCacheHeaders(response: NextResponse, maxAge: number = 300): NextResponse {
  response.headers.set('Cache-Control', `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`)
  response.headers.set('CDN-Cache-Control', `public, s-maxage=${maxAge * 2}`)
  return response
}

// GET /api/production-runs-optimized/[id] - Get single production run with full traceability
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    // Validate ID parameter
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        {
          error: 'Invalid production run ID',
          code: 'INVALID_ID',
          details: { providedId: params.id, expectedType: 'positive integer' }
        },
        { status: 400 }
      )
    }

    // Execute optimized query with performance monitoring
    const { result: productionRun, duration } = await measureQueryPerformance(
      () => getProductionRunByIdOptimized(id),
      `getProductionRunByIdOptimized-${id}`
    )

    if (!productionRun) {
      return NextResponse.json(
        {
          error: 'Production run not found',
          code: 'NOT_FOUND',
          details: { id }
        },
        { status: 404 }
      )
    }

    // Calculate additional metrics for the response
    const metrics = {
      ingredientsUsed: productionRun.BatchIngredient.length,
      palletsProduced: productionRun.Pallet.length,
      shippedPallets: productionRun.Pallet.filter(p => p.shippingStatus === 'shipped').length,
      pendingPallets: productionRun.Pallet.filter(p => p.shippingStatus === 'pending').length,
      yieldPercentage: productionRun.plannedQuantity && productionRun.actualQuantity
        ? (Number(productionRun.actualQuantity) / Number(productionRun.plannedQuantity) * 100).toFixed(2)
        : null,
      durationMinutes: productionRun.startTime && productionRun.endTime
        ? Math.round((productionRun.endTime.getTime() - productionRun.startTime.getTime()) / (1000 * 60))
        : null
    }

    // Enhanced traceability information
    const traceability = {
      upstreamTraceability: {
        ingredients: productionRun.BatchIngredient.map(bi => ({
          ingredientName: bi.IngredientLot.Ingredient.name,
          supplierName: bi.IngredientLot.Ingredient.supplierName,
          supplierCode: bi.IngredientLot.Ingredient.supplierCode,
          supplierLotCode: bi.IngredientLot.supplierLotCode,
          internalLotCode: bi.IngredientLot.internalLotCode,
          quantityUsed: bi.quantityUsed,
          receivedDate: bi.IngredientLot.receivedDate,
          expirationDate: bi.IngredientLot.expirationDate,
          qualityStatus: bi.IngredientLot.qualityStatus,
          allergens: bi.IngredientLot.Ingredient.allergens
        }))
      },
      downstreamTraceability: {
        pallets: productionRun.Pallet.map(p => ({
          palletCode: p.palletCode || p.id.toString(),
          quantityPacked: p.quantityPacked,
          packingDate: p.packingDate,
          expirationDate: p.expirationDate,
          shippingStatus: p.shippingStatus,
          location: p.location,
          notes: p.notes,
          packedBy: p.packedBy
        }))
      }
    }

    const response = NextResponse.json({
      ...productionRun,
      metrics,
      traceability,
      meta: {
        queryTime: `${duration.toFixed(2)}ms`,
        cached: true, // React.cache handles memoization
        timestamp: new Date().toISOString(),
        dataCompleteness: {
          hasRecipe: !!productionRun.Recipe,
          hasIngredients: productionRun.BatchIngredient.length > 0,
          hasPallets: productionRun.Pallet.length > 0,
          hasStartTime: !!productionRun.startTime,
          hasEndTime: !!productionRun.endTime
        }
      }
    })

    // Individual production runs change less frequently, longer cache
    return addCacheHeaders(response, 300) // 5 minute cache with 10 minute stale-while-revalidate
    
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

// PUT /api/production-runs-optimized/[id] - Update production run (placeholder for future optimization)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    {
      message: 'Production run updates not implemented in optimized endpoint yet',
      suggestion: 'Use /api/production-runs/{id} for updates',
      id: params.id
    },
    { status: 501 }
  )
}

// DELETE /api/production-runs-optimized/[id] - Delete production run (placeholder for future optimization)  
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    {
      message: 'Production run deletion not implemented in optimized endpoint yet',
      suggestion: 'Use /api/production-runs/{id} for deletion',
      id: params.id
    },
    { status: 501 }
  )
}
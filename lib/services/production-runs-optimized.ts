import { unstable_cache as cache } from 'next/cache'
import { prisma } from '@/lib/db-optimized'
import { withOptimizedDatabaseOperation } from '@/lib/db-optimized'
import { Prisma } from '@prisma/client'

// Memoized service for production runs with React.cache
export const getProductionRunsOptimized = cache(async (
  filters: {
    search?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    page: number
    limit: number
  }
) => {
  const { page, limit, ...filterParams } = filters
  const skip = (page - 1) * limit

  // Build optimized where clause
  const where: Prisma.ProductionRunWhereInput = {}

  if (filterParams.search) {
    where.OR = [
      { dailyLot: { contains: filterParams.search, mode: 'insensitive' } },
      { cakeLot: { contains: filterParams.search, mode: 'insensitive' } },
      { icingLot: { contains: filterParams.search, mode: 'insensitive' } },
      { equipmentStation: { contains: filterParams.search, mode: 'insensitive' } },
      { notes: { contains: filterParams.search, mode: 'insensitive' } }
    ]
  }

  if (filterParams.status) {
    where.qualityStatus = filterParams.status as any
  }

  if (filterParams.dateFrom || filterParams.dateTo) {
    where.createdAt = {}
    if (filterParams.dateFrom) {
      where.createdAt.gte = new Date(filterParams.dateFrom)
    }
    if (filterParams.dateTo) {
      where.createdAt.lte = new Date(filterParams.dateTo)
    }
  }

  return withOptimizedDatabaseOperation(
    async () => {
      // Use Promise.all for parallel execution + optimized queries
      const [productionRuns, total] = await Promise.all([
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
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.productionRun.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)
      const hasNextPage = page < totalPages
      const hasPreviousPage = page > 1

      return {
        data: productionRuns,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPreviousPage
        }
      }
    },
    'getProductionRunsOptimized'
  )
})

// Memoized service for single production run with all relationships
export const getProductionRunByIdOptimized = cache(async (id: number) => {
  return withOptimizedDatabaseOperation(
    async () => prisma.productionRun.findUnique({
      where: { id },
      include: {
        Recipe: {
          select: {
            id: true,
            name: true,
            description: true,
            version: true,
            isActive: true,
            yieldQuantity: true,
            yieldUnit: true,
            createdAt: true,
            updatedAt: true,
            createdBy: true,
            updatedBy: true
          }
        },
        Pallet: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            palletCode: true,
            quantityPacked: true,
            packingDate: true,
            expirationDate: true,
            shippingStatus: true,
            location: true,
            notes: true,
            packedBy: true,
            createdAt: true,
            updatedAt: true
          }
        },
        BatchIngredient: {
          orderBy: { createdAt: 'asc' },
          include: {
            IngredientLot: {
              include: {
                Ingredient: {
                  select: {
                    id: true,
                    name: true,
                    supplierName: true,
                    supplierCode: true,
                    storageType: true,
                    allergens: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    `getProductionRunByIdOptimized-${id}`
  )
})

// Memoized service for recipes (frequently accessed, slow-changing data)
export const getActiveRecipesOptimized = cache(async () => {
  return withOptimizedDatabaseOperation(
    async () => prisma.recipe.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        isActive: true,
        yieldQuantity: true,
        yieldUnit: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        updatedBy: true,
        // Include production run count for each recipe
        _count: {
          select: {
            ProductionRun: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    }),
    'getActiveRecipesOptimized'
  )
})

// Memoized service for production run statistics
export const getProductionRunStatsOptimized = cache(async (recipeIds?: number[]) => {
  const where: Prisma.ProductionRunWhereInput = recipeIds 
    ? { recipeId: { in: recipeIds } } 
    : {}

  return withOptimizedDatabaseOperation(
    async () => {
      // Use aggregation for better performance
      const stats = await prisma.productionRun.findMany({
        where,
        select: {
          id: true,
          dailyLot: true,
          qualityStatus: true,
          createdAt: true,
          recipeId: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return stats
    },
    'getProductionRunStatsOptimized'
  )
})

// Memoized service for checking recipe existence and status
export const getRecipeByIdOptimized = cache(async (id: number) => {
  return withOptimizedDatabaseOperation(
    async () => prisma.recipe.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        isActive: true,
        version: true,
        yieldQuantity: true,
        yieldUnit: true
      }
    }),
    `getRecipeByIdOptimized-${id}`
  )
})

// Optimized batch operations for ingredient lots
export const getIngredientLotsOptimized = cache(async (
  filters: {
    search?: string
    qualityStatus?: string
    supplierName?: string
    page: number
    limit: number
  }
) => {
  const { page, limit, ...filterParams } = filters
  const skip = (page - 1) * limit

  const where: Prisma.IngredientLotWhereInput = {}

  if (filterParams.search) {
    where.OR = [
      { internalLotCode: { contains: filterParams.search, mode: 'insensitive' } },
      { supplierLotCode: { contains: filterParams.search, mode: 'insensitive' } },
      { Ingredient: { name: { contains: filterParams.search, mode: 'insensitive' } } }
    ]
  }

  if (filterParams.qualityStatus) {
    where.qualityStatus = filterParams.qualityStatus as any
  }

  if (filterParams.supplierName) {
    where.Ingredient = {
      supplierName: { contains: filterParams.supplierName, mode: 'insensitive' }
    }
  }

  return withOptimizedDatabaseOperation(
    async () => {
      const [ingredientLots, total] = await Promise.all([
        prisma.ingredientLot.findMany({
          where,
          include: {
            Ingredient: {
              select: {
                id: true,
                name: true,
                supplierName: true,
                supplierCode: true,
                storageType: true,
                allergens: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.ingredientLot.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)
      const hasNextPage = page < totalPages
      const hasPreviousPage = page > 1

      return {
        data: ingredientLots,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPreviousPage
        }
      }
    },
    'getIngredientLotsOptimized'
  )
})

// Cache key generators for manual cache invalidation if needed
export function generateCacheKey(operation: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = params[key]
      return sorted
    }, {} as Record<string, any>)
  
  return `${operation}-${JSON.stringify(sortedParams)}`
}

// Performance monitoring helper
export async function measureQueryPerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await operation()
  const duration = performance.now() - start
  
  console.log(`[PERF] ${operationName} completed in ${duration.toFixed(2)}ms`)
  
  return { result, duration }
}
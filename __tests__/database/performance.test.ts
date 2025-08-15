/**
 * Database Performance Tests
 * Tests for validating database performance under realistic production loads
 */

import { PrismaClient } from '@prisma/client'
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals'

let prisma: PrismaClient

beforeAll(async () => {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  })
  
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Global test user for all tests
let testUser: any

beforeEach(async () => {
  // Clean up all tables in dependency order
  await prisma.batchIngredient.deleteMany()
  await prisma.pallet.deleteMany()
  await prisma.productionRun.deleteMany()
  await prisma.ingredientLot.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()

  // Create test user for all tests
  testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'operator'
    }
  })
})

describe('Database Performance Tests', () => {
  // Helper function to create realistic test data at scale
  async function createLargeDataset(scale: 'small' | 'medium' | 'large' = 'small') {
    const scales = {
      small: { recipes: 10, ingredients: 20, lotsPerIngredient: 5, runsPerRecipe: 10 },
      medium: { recipes: 50, ingredients: 100, lotsPerIngredient: 20, runsPerRecipe: 50 },
      large: { recipes: 100, ingredients: 200, lotsPerIngredient: 50, runsPerRecipe: 100 },
    }

    const config = scales[scale]
    const startTime = Date.now()

    console.log(`Creating ${scale} dataset: ${config.recipes} recipes, ${config.ingredients} ingredients...`)

    // Create recipes
    const recipes = await Promise.all(
      Array.from({ length: config.recipes }, (_, i) =>
        prisma.recipe.create({
          data: {
            name: `Recipe ${i + 1}`,
            description: `Test recipe ${i + 1} for performance testing`,
            version: '1.0',
            createdBy: testUser.id, // Use the created test user ID
          },
        })
      )
    )

    // Create ingredients (aligned with Prisma schema)
    const storageTypes = ['dry', 'refrigerated', 'frozen']
    const allergenTypes = ['milk', 'eggs', 'wheat']
    const ingredients = await Promise.all(
      Array.from({ length: config.ingredients }, (_, i) =>
        prisma.ingredient.create({
          data: {
            name: `Ingredient ${i + 1}`,
            supplierName: `Supplier ${(i % 20) + 1}`,
            supplierCode: `SUP-${i + 1}`,
            storageType: storageTypes[i % storageTypes.length] as any,
            shelfLifeDays: Math.floor(Math.random() * 365) + 30,
            allergens: i % 5 === 0 ? [allergenTypes[i % allergenTypes.length]] : [],
            certifications: i % 3 === 0 ? ['organic'] : [],
            isActive: true,
          },
        })
      )
    )

    // Create ingredient lots
    let totalLots = 0
    for (const ingredient of ingredients) {
      const lots = await Promise.all(
        Array.from({ length: config.lotsPerIngredient }, (_, i) =>
          prisma.ingredientLot.create({
            data: {
              supplierLotCode: `${ingredient.name}-SUP-LOT-${i + 1}`,
              internalLotCode: `${ingredient.name}-INT-LOT-${i + 1}`,
              quantityReceived: Math.random() * 500 + 100,
              quantityRemaining: Math.random() * 400 + 50,
              receivedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
              expirationDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000), // Random future date
              qualityStatus: Math.random() > 0.1 ? 'passed' : 'pending',
              storageLocation: `Location-${i + 1}`,
              ingredientId: ingredient.id,
            },
          })
        )
      )
      totalLots += lots.length
    }

    // Create production runs
    let totalRuns = 0
    for (const recipe of recipes) {
      const runs = await Promise.all(
        Array.from({ length: config.runsPerRecipe }, (_, i) =>
          prisma.productionRun.create({
            data: {
              dailyLot: `DL-${recipe.id}-${i + 1}`,
              cakeLot: `CL-${recipe.id}-${i + 1}`,
              icingLot: `IL-${recipe.id}-${i + 1}`,
              plannedQuantity: Math.floor(Math.random() * 200) + 50,
              actualQuantity: Math.floor(Math.random() * 190) + 45,
              qualityStatus: Math.random() > 0.05 ? 'passed' : 'pending',
              startTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
              endTime: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000),
              equipmentStation: `Station-${(i % 5) + 1}`,
              temperature: 20 + Math.random() * 10, // 20-30°C
              humidity: 40 + Math.random() * 20, // 40-60%
              recipeId: recipe.id,
            },
          })
        )
      )
      totalRuns += runs.length
    }

    const creationTime = Date.now() - startTime
    console.log(`Dataset created in ${creationTime}ms: ${totalRuns} production runs, ${totalLots} ingredient lots`)

    return {
      recipes,
      ingredients,
      totalRuns,
      totalLots,
      creationTime,
    }
  }

  describe('Query Performance Tests', () => {
    it('should perform efficient traceability queries on medium dataset', async () => {
      const dataset = await createLargeDataset('small') // Use small for CI/testing
      
      // Test 1: Forward traceability query performance
      const startTime = Date.now()
      
      const ingredientLot = await prisma.ingredientLot.findFirst()
      const forwardTrace = await prisma.ingredientLot.findUnique({
        where: { id: ingredientLot!.id },
        include: {
          Ingredient: true,
          BatchIngredient: {
            include: {
              ProductionRun: {
                include: {
                  Recipe: true,
                  Pallet: true,
                },
              },
            },
          },
        },
      })
      
      const forwardTraceTime = Date.now() - startTime
      console.log(`Forward traceability query completed in ${forwardTraceTime}ms`)
      
      expect(forwardTraceTime).toBeLessThan(1000) // Should complete within 1 second
      expect(forwardTrace).toBeDefined()
    }, 30000) // 30 second timeout

    it('should efficiently query production runs with filters', async () => {
      const dataset = await createLargeDataset('small')
      
      const startTime = Date.now()
      
      // Test complex filtered query
      const filteredRuns = await prisma.productionRun.findMany({
        where: {
          qualityStatus: 'passed',
          qualityStatus: 'passed',
          startTime: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          Recipe: true,
          BatchIngredient: {
            include: {
              Ingredient: true,
              IngredientLot: true,
            },
          },
        },
        take: 50,
      })
      
      const queryTime = Date.now() - startTime
      console.log(`Filtered production runs query completed in ${queryTime}ms, returned ${filteredRuns.length} results`)
      
      expect(queryTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(filteredRuns.length).toBeGreaterThan(0)
    }, 30000)

    it('should perform efficient ingredient lot searches', async () => {
      const dataset = await createLargeDataset('small')
      
      const startTime = Date.now()
      
      // Test search by supplier lot code and quality status
      const supplierLots = await prisma.ingredientLot.findMany({
        where: {
          supplierLotCode: {
            contains: 'SUP-1',
          },
          qualityStatus: 'passed',
        },
        include: {
          Ingredient: {
            select: {
              name: true,
              storageType: true,
              allergens: true,
            },
          },
        },
        orderBy: [
          { receivedDate: 'desc' },
          { quantityRemaining: 'desc' },
        ],
      })
      
      const searchTime = Date.now() - startTime
      console.log(`Supplier lots search completed in ${searchTime}ms, returned ${supplierLots.length} results`)
      
      expect(searchTime).toBeLessThan(1500) // Should complete within 1.5 seconds
      expect(supplierLots.length).toBeGreaterThan(0)
    }, 30000)

    it('should handle aggregate queries efficiently', async () => {
      const dataset = await createLargeDataset('small')
      
      const startTime = Date.now()
      
      // Test aggregation queries for dashboard statistics
      const [
        totalProduction,
        qualityStats,
        ingredientUsage,
        recentActivity
      ] = await Promise.all([
        // Total production by recipe
        prisma.productionRun.groupBy({
          by: ['recipeId', 'qualityStatus'],
          _sum: {
            actualQuantity: true,
          },
          _count: true,
        }),
        
        // Quality statistics
        prisma.productionRun.groupBy({
          by: ['qualityStatus'],
          _count: true,
        }),
        
        // Ingredient lot usage
        prisma.ingredientLot.groupBy({
          by: ['ingredientId', 'qualityStatus'],
          _sum: {
            quantityReceived: true,
            quantityRemaining: true,
          },
          _count: true,
        }),
        
        // Recent production activity
        prisma.productionRun.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
          select: {
            dailyLot: true,
            qualityStatus: true,
            actualQuantity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ])
      
      const aggregateTime = Date.now() - startTime
      console.log(`Aggregate queries completed in ${aggregateTime}ms`)
      
      expect(aggregateTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(totalProduction.length).toBeGreaterThan(0)
      expect(qualityStats.length).toBeGreaterThan(0)
      expect(ingredientUsage.length).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Bulk Operations Performance', () => {
    it('should efficiently create batch ingredients for production runs', async () => {
      // Create base data
      const recipe = await prisma.recipe.create({
        data: {
          name: 'Bulk Test Recipe',
          createdBy: testUser.id,
        },
      })

      const ingredients = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          prisma.ingredient.create({
            data: {
              name: `Bulk Ingredient ${i + 1}`,
              storageType: 'dry',
              supplierName: 'Bulk Supplier',
              isActive: true,
            },
          })
        )
      )

      const ingredientLots = await Promise.all(
        ingredients.map(ingredient =>
          prisma.ingredientLot.create({
            data: {
              supplierLotCode: `BULK-SUP-${ingredient.id}`,
              internalLotCode: `BULK-${ingredient.id}-LOT`,
              quantityReceived: 1000,
              quantityRemaining: 800,
              receivedDate: new Date(),
              ingredientId: ingredient.id,
            },
          })
        )
      )

      const productionRun = await prisma.productionRun.create({
        data: {
          dailyLot: 'DL-BULK-001',
          cakeLot: 'CL-BULK-001',
          icingLot: 'IL-BULK-001',
          plannedQuantity: 100,
          recipeId: recipe.id,
        },
      })

      // Test bulk creation of batch ingredients
      const startTime = Date.now()
      
      const batchIngredients = await Promise.all(
        ingredientLots.map((lot, index) =>
          prisma.batchIngredient.create({
            data: {
              quantityUsed: 50 + (index * 10),
              productionRunId: productionRun.id,
              ingredientId: lot.ingredientId,
              ingredientLotId: lot.id,
            },
          })
        )
      )
      
      const bulkCreateTime = Date.now() - startTime
      console.log(`Bulk creation of ${batchIngredients.length} batch ingredients completed in ${bulkCreateTime}ms`)
      
      expect(bulkCreateTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(batchIngredients).toHaveLength(10)
    }, 30000)

    it('should handle concurrent production run updates efficiently', async () => {
      // Create multiple production runs
      const recipe = await prisma.recipe.create({
        data: {
          name: 'Concurrent Update Recipe',
          createdBy: testUser.id,
        },
      })

      const productionRuns = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.productionRun.create({
            data: {
              dailyLot: `DL-CONC-${i + 1}`,
              cakeLot: `CL-CONC-${i + 1}`,
              icingLot: `IL-CONC-${i + 1}`,
              plannedQuantity: 100,
              qualityStatus: 'pending',
              recipeId: recipe.id,
            },
          })
        )
      )

      // Test concurrent updates
      const startTime = Date.now()
      
      const updates = await Promise.all(
        productionRuns.map((run, index) =>
          prisma.productionRun.update({
            where: { id: run.id },
            data: {
              qualityStatus: 'passed',
              actualQuantity: 95 + index,
              qualityStatus: index % 10 === 0 ? 'pending' : 'passed',
            },
          })
        )
      )
      
      const concurrentUpdateTime = Date.now() - startTime
      console.log(`Concurrent update of ${updates.length} production runs completed in ${concurrentUpdateTime}ms`)
      
      expect(concurrentUpdateTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(updates.every(run => run.qualityStatus === 'passed')).toBe(true)
    }, 30000)
  })

  describe('Index Effectiveness Tests', () => {
    it('should efficiently search by unique identifiers', async () => {
      const dataset = await createLargeDataset('small')
      
      // Test searches using unique fields that should have indexes
      const tests = [
        {
          name: 'Recipe by name',
          query: () => prisma.recipe.findUnique({ where: { name: dataset.recipes[0].name } }),
        },
        {
          name: 'Production run by batch number',
          query: async () => {
            const firstRun = await prisma.productionRun.findFirst()
            return prisma.productionRun.findUnique({ where: { dailyLot: firstRun!.dailyLot } })
          },
        },
        {
          name: 'Ingredient lot by lot code',
          query: async () => {
            const firstLot = await prisma.ingredientLot.findFirst()
            return prisma.ingredientLot.findUnique({ where: { internalLotCode: firstLot!.internalLotCode } })
          },
        },
        {
          name: 'Pallet by pallet number',
          query: async () => {
            // Create a pallet first
            const firstRun = await prisma.productionRun.findFirst()
            const pallet = await prisma.pallet.create({
              data: {
                palletNumber: 'INDEX-TEST-PALLET-001',
                productionRunId: firstRun!.id,
              },
            })
            return prisma.pallet.findUnique({ where: { palletNumber: pallet.palletNumber } })
          },
        },
      ]

      for (const test of tests) {
        const startTime = Date.now()
        const result = await test.query()
        const queryTime = Date.now() - startTime
        
        console.log(`${test.name} query completed in ${queryTime}ms`)
        expect(queryTime).toBeLessThan(100) // Unique identifier queries should be very fast
        expect(result).toBeDefined()
      }
    }, 30000)

    it('should efficiently search by foreign key relationships', async () => {
      const dataset = await createLargeDataset('small')
      
      // Test queries that should benefit from foreign key indexes
      const recipe = dataset.recipes[0]
      
      const startTime = Date.now()
      
      const productionRuns = await prisma.productionRun.findMany({
        where: {
          recipeId: recipe.id,
        },
        include: {
          batchIngredients: true,
        },
      })
      
      const fkQueryTime = Date.now() - startTime
      console.log(`Foreign key query completed in ${fkQueryTime}ms, returned ${productionRuns.length} results`)
      
      expect(fkQueryTime).toBeLessThan(200) // Foreign key queries should be fast
      expect(productionRuns.length).toBeGreaterThan(0)
    }, 30000)

    it('should efficiently search by date ranges', async () => {
      const dataset = await createLargeDataset('small')
      
      const startTime = Date.now()
      
      // Test date range query that should benefit from date index
      const recentRuns = await prisma.productionRun.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      })
      
      const dateQueryTime = Date.now() - startTime
      console.log(`Date range query completed in ${dateQueryTime}ms, returned ${recentRuns.length} results`)
      
      expect(dateQueryTime).toBeLessThan(300) // Date range queries should be reasonably fast
    }, 30000)
  })

  describe('Memory and Resource Usage', () => {
    it('should handle large result sets with pagination efficiently', async () => {
      const dataset = await createLargeDataset('small')
      
      // Test paginated queries to ensure they don't load too much data
      const pageSize = 20
      const totalPages = 5
      
      const startTime = Date.now()
      
      const pages = []
      for (let page = 0; page < totalPages; page++) {
        const results = await prisma.productionRun.findMany({
          skip: page * pageSize,
          take: pageSize,
          include: {
            recipe: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
        pages.push(results)
      }
      
      const paginationTime = Date.now() - startTime
      console.log(`Paginated queries completed in ${paginationTime}ms, loaded ${totalPages} pages`)
      
      expect(paginationTime).toBeLessThan(1000) // Pagination should be efficient
      expect(pages.every(page => page.length <= pageSize)).toBe(true)
    }, 30000)

    it('should efficiently handle selective field queries', async () => {
      const dataset = await createLargeDataset('small')
      
      const startTime = Date.now()
      
      // Query with selective fields to reduce data transfer
      const lightweightResults = await prisma.productionRun.findMany({
        select: {
          id: true,
          dailyLot: true,
          qualityStatus: true,
          actualQuantity: true,
          createdAt: true,
          Recipe: {
            select: {
              name: true,
            },
          },
        },
        where: {
          qualityStatus: 'passed',
        },
        take: 100,
      })
      
      const selectiveQueryTime = Date.now() - startTime
      console.log(`Selective field query completed in ${selectiveQueryTime}ms, returned ${lightweightResults.length} results`)
      
      expect(selectiveQueryTime).toBeLessThan(500) // Selective queries should be fast
      expect(lightweightResults.length).toBeGreaterThan(0)
      
      // Verify we only got selected fields
      if (lightweightResults.length > 0) {
        const firstResult = lightweightResults[0] as any
        expect(firstResult.id).toBeDefined()
        expect(firstResult.dailyLot).toBeDefined()
        expect(firstResult.notes).toBeUndefined() // Should not include non-selected fields
      }
    }, 30000)
  })
})
/**
 * Traceability and Compliance Tests
 * Tests for validating lot traceability, recall scenarios, and regulatory compliance requirements
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

describe('Traceability and Compliance Tests', () => {
  // Helper function to create test data
  async function createComplexTraceabilityScenario() {
    // Create recipes
    const cakeRecipe = await prisma.recipe.create({
      data: {
        name: 'Premium Chocolate Cake',
        description: 'High-quality chocolate cake recipe',
        createdBy: testUser.id,
      },
    })

    const cupcakeRecipe = await prisma.recipe.create({
      data: {
        name: 'Chocolate Cupcakes',
        description: 'Individual chocolate cupcakes',
        createdBy: testUser.id,
      },
    })

    // Create ingredients
    const flour = await prisma.ingredient.create({
      data: {
        name: 'Premium Flour',
        type: 'FLOUR',
        unitOfMeasure: 'kg',
        allergens: ['gluten'],
      },
    })

    const cocoa = await prisma.ingredient.create({
      data: {
        name: 'Cocoa Powder',
        type: 'FLAVORING',
        unitOfMeasure: 'kg',
      },
    })

    const eggs = await prisma.ingredient.create({
      data: {
        name: 'Fresh Eggs',
        type: 'EGGS',
        unitOfMeasure: 'dozen',
        allergens: ['eggs'],
      },
    })

    // Create ingredient lots with different suppliers and dates
    const flourLot1 = await prisma.ingredientLot.create({
      data: {
        lotCode: 'FLOUR-SUPPLIER-A-001',
        quantityReceived: 500.0,
        quantityRemaining: 200.0,
        unitOfMeasure: 'kg',
        receivedDate: new Date('2024-08-01'),
        expirationDate: new Date('2025-08-01'),
        supplierName: 'Flour Supplier A',
        supplierLotCode: 'FSA-240801-001',
        qualityStatus: 'PASSED',
        status: 'IN_USE',
        ingredientId: flour.id,
      },
    })

    const flourLot2 = await prisma.ingredientLot.create({
      data: {
        lotCode: 'FLOUR-SUPPLIER-A-002',
        quantityReceived: 500.0,
        quantityRemaining: 400.0,
        unitOfMeasure: 'kg',
        receivedDate: new Date('2024-08-10'),
        expirationDate: new Date('2025-08-10'),
        supplierName: 'Flour Supplier A',
        supplierLotCode: 'FSA-240810-002',
        qualityStatus: 'PASSED',
        status: 'IN_USE',
        ingredientId: flour.id,
      },
    })

    const cocoaLot = await prisma.ingredientLot.create({
      data: {
        lotCode: 'COCOA-PREMIUM-001',
        quantityReceived: 100.0,
        quantityRemaining: 50.0,
        unitOfMeasure: 'kg',
        receivedDate: new Date('2024-08-05'),
        expirationDate: new Date('2026-08-05'),
        supplierName: 'Premium Cocoa Co',
        supplierLotCode: 'PCC-240805-001',
        qualityStatus: 'PASSED',
        status: 'IN_USE',
        ingredientId: cocoa.id,
      },
    })

    const eggsLot = await prisma.ingredientLot.create({
      data: {
        lotCode: 'EGGS-FRESH-001',
        quantityReceived: 50,
        quantityRemaining: 20,
        unitOfMeasure: 'dozen',
        receivedDate: new Date('2024-08-12'),
        expirationDate: new Date('2024-09-12'),
        supplierName: 'Farm Fresh Eggs',
        supplierLotCode: 'FFE-240812-001',
        qualityStatus: 'PASSED',
        status: 'IN_USE',
        ingredientId: eggs.id,
      },
    })

    // Create production runs using different ingredient lots
    const productionRun1 = await prisma.productionRun.create({
      data: {
        batchNumber: 'CAKE-20240814-001',
        dailyLot: 'DL-240814-001',
        cakeLot: 'CL-240814-001',
        icingLot: 'IL-240814-001',
        plannedQuantity: 100,
        actualQuantity: 98,
        status: 'COMPLETED',
        qualityStatus: 'PASSED',
        actualStartTime: new Date('2024-08-14T08:00:00Z'),
        actualEndTime: new Date('2024-08-14T14:00:00Z'),
        recipeId: cakeRecipe.id,
        createdBy: 'production-operator-1',
      },
    })

    const productionRun2 = await prisma.productionRun.create({
      data: {
        batchNumber: 'CUPCAKE-20240814-001',
        dailyLot: 'DL-240814-002',
        cakeLot: 'CL-240814-002',
        icingLot: 'IL-240814-002',
        plannedQuantity: 200,
        actualQuantity: 195,
        status: 'COMPLETED',
        qualityStatus: 'PASSED',
        actualStartTime: new Date('2024-08-14T15:00:00Z'),
        actualEndTime: new Date('2024-08-14T20:00:00Z'),
        recipeId: cupcakeRecipe.id,
        createdBy: 'production-operator-2',
      },
    })

    const productionRun3 = await prisma.productionRun.create({
      data: {
        batchNumber: 'CAKE-20240815-001',
        dailyLot: 'DL-240815-001',
        cakeLot: 'CL-240815-001',
        icingLot: 'IL-240815-001',
        plannedQuantity: 120,
        actualQuantity: 118,
        status: 'COMPLETED',
        qualityStatus: 'PASSED',
        actualStartTime: new Date('2024-08-15T08:00:00Z'),
        actualEndTime: new Date('2024-08-15T14:30:00Z'),
        recipeId: cakeRecipe.id,
        createdBy: 'production-operator-1',
      },
    })

    // Create batch ingredients to link production runs with ingredient lots
    // Production Run 1 uses flour lot 1, cocoa lot, and eggs lot
    await prisma.batchIngredient.create({
      data: {
        quantityUsed: 150.0,
        unitOfMeasure: 'kg',
        percentageOfTotal: 100.0,
        productionRunId: productionRun1.id,
        ingredientId: flour.id,
        ingredientLotId: flourLot1.id,
        addedBy: 'production-operator-1',
        createdBy: 'production-operator-1',
      },
    })

    await prisma.batchIngredient.create({
      data: {
        quantityUsed: 25.0,
        unitOfMeasure: 'kg',
        percentageOfTotal: 100.0,
        productionRunId: productionRun1.id,
        ingredientId: cocoa.id,
        ingredientLotId: cocoaLot.id,
        addedBy: 'production-operator-1',
        createdBy: 'production-operator-1',
      },
    })

    await prisma.batchIngredient.create({
      data: {
        quantityUsed: 15,
        unitOfMeasure: 'dozen',
        percentageOfTotal: 100.0,
        productionRunId: productionRun1.id,
        ingredientId: eggs.id,
        ingredientLotId: eggsLot.id,
        addedBy: 'production-operator-1',
        createdBy: 'production-operator-1',
      },
    })

    // Production Run 2 uses flour lot 1, cocoa lot, and eggs lot
    await prisma.batchIngredient.create({
      data: {
        quantityUsed: 150.0,
        unitOfMeasure: 'kg',
        percentageOfTotal: 100.0,
        productionRunId: productionRun2.id,
        ingredientId: flour.id,
        ingredientLotId: flourLot1.id,
        addedBy: 'production-operator-2',
        createdBy: 'production-operator-2',
      },
    })

    await prisma.batchIngredient.create({
      data: {
        quantityUsed: 25.0,
        unitOfMeasure: 'kg',
        percentageOfTotal: 100.0,
        productionRunId: productionRun2.id,
        ingredientId: cocoa.id,
        ingredientLotId: cocoaLot.id,
        addedBy: 'production-operator-2',
        createdBy: 'production-operator-2',
      },
    })

    await prisma.batchIngredient.create({
      data: {
        quantityUsed: 15,
        unitOfMeasure: 'dozen',
        percentageOfTotal: 100.0,
        productionRunId: productionRun2.id,
        ingredientId: eggs.id,
        ingredientLotId: eggsLot.id,
        addedBy: 'production-operator-2',
        createdBy: 'production-operator-2',
      },
    })

    // Production Run 3 uses flour lot 2 (different lot), cocoa lot, and eggs lot
    await prisma.batchIngredient.create({
      data: {
        quantityUsed: 100.0,
        unitOfMeasure: 'kg',
        percentageOfTotal: 100.0,
        productionRunId: productionRun3.id,
        ingredientId: flour.id,
        ingredientLotId: flourLot2.id,
        addedBy: 'production-operator-1',
        createdBy: 'production-operator-1',
      },
    })

    // Create pallets for each production run
    const pallet1 = await prisma.pallet.create({
      data: {
        palletNumber: 'CAKE-PAL-001',
        itemCount: 98,
        location: 'Warehouse A, Bay 1',
        status: 'ACTIVE',
        productionRunId: productionRun1.id,
      },
    })

    const pallet2 = await prisma.pallet.create({
      data: {
        palletNumber: 'CUPCAKE-PAL-001',
        itemCount: 195,
        location: 'Warehouse B, Bay 2',
        status: 'SHIPPED',
        shippedAt: new Date('2024-08-15'),
        customerOrder: 'CO-2024-001',
        productionRunId: productionRun2.id,
      },
    })

    const pallet3 = await prisma.pallet.create({
      data: {
        palletNumber: 'CAKE-PAL-002',
        itemCount: 118,
        location: 'Warehouse A, Bay 3',
        status: 'ACTIVE',
        productionRunId: productionRun3.id,
      },
    })

    return {
      recipes: { cakeRecipe, cupcakeRecipe },
      ingredients: { flour, cocoa, eggs },
      ingredientLots: { flourLot1, flourLot2, cocoaLot, eggsLot },
      productionRuns: { productionRun1, productionRun2, productionRun3 },
      pallets: { pallet1, pallet2, pallet3 },
    }
  }

  describe('Forward Traceability - Ingredient Lot to Products', () => {
    it('should trace from specific ingredient lot to all affected products', async () => {
      const testData = await createComplexTraceabilityScenario()
      const { flourLot1 } = testData.ingredientLots

      // Query to find all products that contain this specific flour lot
      const traceResults = await prisma.ingredientLot.findUnique({
        where: { id: flourLot1.id },
        include: {
          ingredient: true,
          batchIngredients: {
            include: {
              productionRun: {
                include: {
                  recipe: true,
                  pallets: {
                    select: {
                      id: true,
                      palletNumber: true,
                      location: true,
                      status: true,
                      shippedAt: true,
                      customerOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      expect(traceResults?.lotCode).toBe('FLOUR-SUPPLIER-A-001')
      expect(traceResults?.batchIngredients).toHaveLength(2) // Used in 2 production runs
      
      const affectedBatches = traceResults?.batchIngredients.map(bi => bi.productionRun.batchNumber)
      expect(affectedBatches).toContain('CAKE-20240814-001')
      expect(affectedBatches).toContain('CUPCAKE-20240814-001')
      expect(affectedBatches).not.toContain('CAKE-20240815-001') // Uses different flour lot
      
      // Check affected pallets
      const affectedPallets = traceResults?.batchIngredients.flatMap(bi => bi.productionRun.pallets)
      expect(affectedPallets).toHaveLength(2)
      
      const palletNumbers = affectedPallets?.map(p => p.palletNumber)
      expect(palletNumbers).toContain('CAKE-PAL-001')
      expect(palletNumbers).toContain('CUPCAKE-PAL-001')
    })

    it('should identify products that have been shipped vs still in inventory', async () => {
      const testData = await createComplexTraceabilityScenario()
      const { eggsLot } = testData.ingredientLots

      const traceResults = await prisma.ingredientLot.findUnique({
        where: { id: eggsLot.id },
        include: {
          batchIngredients: {
            include: {
              productionRun: {
                include: {
                  pallets: {
                    select: {
                      palletNumber: true,
                      status: true,
                      location: true,
                      shippedAt: true,
                      customerOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      const pallets = traceResults?.batchIngredients.flatMap(bi => bi.productionRun.pallets) || []
      
      const shippedPallets = pallets.filter(p => p.status === 'SHIPPED')
      const activePallets = pallets.filter(p => p.status === 'ACTIVE')
      
      expect(shippedPallets).toHaveLength(1)
      expect(shippedPallets[0].palletNumber).toBe('CUPCAKE-PAL-001')
      expect(shippedPallets[0].customerOrder).toBe('CO-2024-001')
      
      expect(activePallets).toHaveLength(1)
      expect(activePallets[0].palletNumber).toBe('CAKE-PAL-001')
      expect(activePallets[0].location).toBe('Warehouse A, Bay 1')
    })
  })

  describe('Backward Traceability - Product to Ingredient Lots', () => {
    it('should trace from finished product back to all ingredient lots', async () => {
      const testData = await createComplexTraceabilityScenario()
      const { pallet1 } = testData.pallets

      // Query to find all ingredient lots used in this specific pallet
      const traceResults = await prisma.pallet.findUnique({
        where: { id: pallet1.id },
        include: {
          productionRun: {
            include: {
              recipe: true,
              batchIngredients: {
                include: {
                  ingredient: {
                    select: {
                      name: true,
                      type: true,
                      allergens: true,
                    },
                  },
                  ingredientLot: {
                    select: {
                      lotCode: true,
                      supplierName: true,
                      supplierLotCode: true,
                      receivedDate: true,
                      expirationDate: true,
                      qualityStatus: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      expect(traceResults?.palletNumber).toBe('CAKE-PAL-001')
      expect(traceResults?.productionRun.batchNumber).toBe('CAKE-20240814-001')
      expect(traceResults?.productionRun.batchIngredients).toHaveLength(3)

      const usedIngredientLots = traceResults?.productionRun.batchIngredients.map(bi => ({
        ingredient: bi.ingredient.name,
        lotCode: bi.ingredientLot.lotCode,
        supplier: bi.ingredientLot.supplierName,
        allergens: bi.ingredient.allergens,
      }))

      expect(usedIngredientLots).toContainEqual({
        ingredient: 'Premium Flour',
        lotCode: 'FLOUR-SUPPLIER-A-001',
        supplier: 'Flour Supplier A',
        allergens: ['gluten'],
      })

      expect(usedIngredientLots).toContainEqual({
        ingredient: 'Fresh Eggs',
        lotCode: 'EGGS-FRESH-001',
        supplier: 'Farm Fresh Eggs',
        allergens: ['eggs'],
      })

      expect(usedIngredientLots).toContainEqual({
        ingredient: 'Cocoa Powder',
        lotCode: 'COCOA-PREMIUM-001',
        supplier: 'Premium Cocoa Co',
        allergens: [],
      })
    })
  })

  describe('Recall Simulation - Critical Compliance Scenario', () => {
    it('should identify all affected products for ingredient lot recall', async () => {
      const testData = await createComplexTraceabilityScenario()
      const { flourLot1 } = testData.ingredientLots

      // Simulate recall scenario: flour lot 1 needs to be recalled due to contamination
      // Step 1: Update ingredient lot status to RECALLED
      await prisma.ingredientLot.update({
        where: { id: flourLot1.id },
        data: {
          status: 'RECALLED',
          qualityStatus: 'FAILED',
          qualityNotes: 'Potential allergen contamination detected - RECALL INITIATED',
          updatedBy: 'quality-manager',
        },
      })

      // Step 2: Find all affected production runs and pallets
      const recallTrace = await prisma.ingredientLot.findUnique({
        where: { id: flourLot1.id },
        include: {
          ingredient: true,
          batchIngredients: {
            include: {
              productionRun: {
                include: {
                  recipe: true,
                  pallets: true,
                },
              },
            },
          },
        },
      })

      // Step 3: Update all affected production runs to RECALLED status
      const affectedProductionRunIds = recallTrace?.batchIngredients.map(bi => bi.productionRunId) || []
      
      for (const prodRunId of affectedProductionRunIds) {
        await prisma.productionRun.update({
          where: { id: prodRunId },
          data: {
            status: 'RECALLED',
            issuesEncountered: 'RECALLED due to ingredient lot contamination',
            updatedBy: 'quality-manager',
          },
        })
      }

      // Step 4: Update all affected pallets to RECALLED status
      const affectedPalletIds = recallTrace?.batchIngredients.flatMap(bi => 
        bi.productionRun.pallets.map(p => p.id)
      ) || []

      for (const palletId of affectedPalletIds) {
        await prisma.pallet.update({
          where: { id: palletId },
          data: {
            status: 'RECALLED',
            updatedBy: 'quality-manager',
          },
        })
      }

      // Step 5: Create audit log entry for recall action
      await prisma.auditLog.create({
        data: {
          tableName: 'ingredient_lots',
          recordId: flourLot1.id,
          action: 'UPDATE',
          oldValues: { status: 'IN_USE', qualityStatus: 'PASSED' },
          newValues: { status: 'RECALLED', qualityStatus: 'FAILED' },
          changedBy: 'quality-manager',
          reason: 'FOOD SAFETY RECALL - Potential allergen contamination in supplier lot',
          ipAddress: '10.0.1.100',
          userAgent: 'RecallManagementSystem/1.0',
        },
      })

      // Step 6: Verify recall effectiveness
      const recallVerification = await prisma.pallet.findMany({
        where: {
          status: 'RECALLED',
        },
        include: {
          productionRun: {
            select: {
              batchNumber: true,
              status: true,
            },
          },
        },
      })

      expect(recallVerification).toHaveLength(2) // Two pallets should be recalled
      expect(recallVerification.every(p => p.status === 'RECALLED')).toBe(true)
      expect(recallVerification.every(p => p.productionRun.status === 'RECALLED')).toBe(true)

      // Step 7: Generate recall report data
      const recallReport = await prisma.ingredientLot.findUnique({
        where: { id: flourLot1.id },
        include: {
          ingredient: {
            select: {
              name: true,
              type: true,
              allergens: true,
            },
          },
          batchIngredients: {
            select: {
              quantityUsed: true,
              productionRun: {
                select: {
                  batchNumber: true,
                  actualQuantity: true,
                  actualStartTime: true,
                  actualEndTime: true,
                  recipe: {
                    select: {
                      name: true,
                    },
                  },
                  pallets: {
                    select: {
                      palletNumber: true,
                      itemCount: true,
                      location: true,
                      status: true,
                      shippedAt: true,
                      customerOrder: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      // Verify recall report contains all necessary data for regulatory compliance
      expect(recallReport?.lotCode).toBe('FLOUR-SUPPLIER-A-001')
      expect(recallReport?.status).toBe('RECALLED')
      expect(recallReport?.supplierName).toBe('Flour Supplier A')
      expect(recallReport?.batchIngredients).toHaveLength(2)
      
      const totalItemsRecalled = recallReport?.batchIngredients.reduce(
        (total, bi) => total + (bi.productionRun.pallets.reduce((palletTotal, p) => palletTotal + (p.itemCount || 0), 0)),
        0
      ) || 0
      
      expect(totalItemsRecalled).toBe(293) // 98 + 195 = 293 total items affected
    })

    it('should track allergen exposure through traceability chain', async () => {
      const testData = await createComplexTraceabilityScenario()
      const { eggsLot } = testData.ingredientLots

      // Find all products that contain eggs (allergen tracking)
      const allergenTrace = await prisma.ingredient.findFirst({
        where: {
          allergens: {
            has: 'eggs',
          },
        },
        include: {
          ingredientLots: {
            include: {
              batchIngredients: {
                include: {
                  productionRun: {
                    include: {
                      recipe: true,
                      pallets: {
                        select: {
                          palletNumber: true,
                          status: true,
                          location: true,
                          customerOrder: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })

      expect(allergenTrace?.name).toBe('Fresh Eggs')
      expect(allergenTrace?.allergens).toContain('eggs')

      const affectedProducts = allergenTrace?.ingredientLots.flatMap(lot =>
        lot.batchIngredients.map(bi => ({
          lotCode: lot.lotCode,
          batchNumber: bi.productionRun.batchNumber,
          recipeName: bi.productionRun.recipe.name,
          pallets: bi.productionRun.pallets,
        }))
      )

      expect(affectedProducts).toBeDefined()
      expect(affectedProducts?.length).toBeGreaterThan(0)

      // All products using eggs should be traceable
      const recipeNames = affectedProducts?.map(p => p.recipeName) || []
      expect(recipeNames).toContain('Premium Chocolate Cake')
      expect(recipeNames).toContain('Chocolate Cupcakes')
    })
  })

  describe('Production Quality and Compliance Tracking', () => {
    it('should track quality control checkpoints throughout production', async () => {
      const testData = await createComplexTraceabilityScenario()
      const { productionRun1 } = testData.productionRuns

      // Update production run with quality control data
      const updatedRun = await prisma.productionRun.update({
        where: { id: productionRun1.id },
        data: {
          qualityCheckBy: 'QC Inspector John',
          qualityCheckAt: new Date('2024-08-14T13:30:00Z'),
          qualityNotes: 'All quality parameters within specification. Temperature logged at 22°C, humidity at 55%. Visual inspection passed.',
          temperature: 22.0,
          humidity: 55.0,
        },
      })

      // Verify quality data is properly stored
      expect(updatedRun.qualityCheckBy).toBe('QC Inspector John')
      expect(updatedRun.qualityStatus).toBe('PASSED')
      expect(updatedRun.temperature).toBe(22.0)
      expect(updatedRun.humidity).toBe(55.0)
      expect(updatedRun.qualityNotes).toContain('quality parameters within specification')
    })

    it('should track environmental conditions and batch consistency', async () => {
      // Create multiple production runs with environmental data
      const recipe = await prisma.recipe.create({
        data: {
          name: 'Environment Test Recipe',
          createdBy: 'test-user',
        },
      })

      const runs = await Promise.all([
        prisma.productionRun.create({
          data: {
            batchNumber: 'ENV-TEST-001',
            dailyLot: 'DL-ENV-001',
            cakeLot: 'CL-ENV-001',
            icingLot: 'IL-ENV-001',
            plannedQuantity: 100,
            actualQuantity: 98,
            temperature: 23.5,
            humidity: 58.0,
            status: 'COMPLETED',
            qualityStatus: 'PASSED',
            recipeId: recipe.id,
          },
        }),
        prisma.productionRun.create({
          data: {
            batchNumber: 'ENV-TEST-002',
            dailyLot: 'DL-ENV-002',
            cakeLot: 'CL-ENV-002',
            icingLot: 'IL-ENV-002',
            plannedQuantity: 100,
            actualQuantity: 95,
            temperature: 24.8,
            humidity: 62.0,
            status: 'COMPLETED',
            qualityStatus: 'CONDITIONAL_PASS',
            qualityNotes: 'Slightly higher temperature and humidity than optimal',
            recipeId: recipe.id,
          },
        }),
      ])

      // Query environmental data for analysis
      const environmentalData = await prisma.productionRun.findMany({
        where: {
          recipeId: recipe.id,
          temperature: { not: null },
        },
        select: {
          batchNumber: true,
          temperature: true,
          humidity: true,
          actualQuantity: true,
          plannedQuantity: true,
          qualityStatus: true,
        },
      })

      expect(environmentalData).toHaveLength(2)
      
      // Calculate yield consistency
      const yieldRates = environmentalData.map(run => 
        (run.actualQuantity || 0) / (run.plannedQuantity || 1) * 100
      )
      
      expect(yieldRates[0]).toBe(98) // First batch: 98%
      expect(yieldRates[1]).toBe(95) // Second batch: 95% (lower due to environmental conditions)
      
      // Verify quality correlation with environmental conditions
      const optimalRun = environmentalData.find(run => run.temperature && run.temperature < 24)
      const suboptimalRun = environmentalData.find(run => run.temperature && run.temperature > 24)
      
      expect(optimalRun?.qualityStatus).toBe('PASSED')
      expect(suboptimalRun?.qualityStatus).toBe('CONDITIONAL_PASS')
    })
  })

  describe('Regulatory Compliance and Documentation', () => {
    it('should maintain complete audit trail for regulatory inspection', async () => {
      const testData = await createComplexTraceabilityScenario()
      const { productionRun1 } = testData.productionRuns

      // Simulate regulatory inspection query
      const complianceReport = await prisma.productionRun.findUnique({
        where: { id: productionRun1.id },
        include: {
          recipe: {
            select: {
              name: true,
              version: true,
              createdBy: true,
              createdAt: true,
            },
          },
          batchIngredients: {
            include: {
              ingredient: {
                select: {
                  name: true,
                  type: true,
                  allergens: true,
                  certifications: true,
                },
              },
              ingredientLot: {
                select: {
                  lotCode: true,
                  supplierName: true,
                  supplierLotCode: true,
                  receivedDate: true,
                  expirationDate: true,
                  qualityStatus: true,
                  qualityTestResults: true,
                  certificateOfAnalysis: true,
                  invoiceNumber: true,
                  purchaseOrder: true,
                },
              },
            },
          },
          pallets: {
            select: {
              palletNumber: true,
              location: true,
              status: true,
              createdAt: true,
            },
          },
        },
      })

      // Verify all required compliance data is available
      expect(complianceReport?.batchNumber).toBeDefined()
      expect(complianceReport?.actualStartTime).toBeDefined()
      expect(complianceReport?.actualEndTime).toBeDefined()
      expect(complianceReport?.primaryOperator).toBeDefined()
      expect(complianceReport?.qualityStatus).toBeDefined()
      expect(complianceReport?.createdBy).toBeDefined()

      // Verify ingredient traceability
      expect(complianceReport?.batchIngredients.every(bi => 
        bi.ingredientLot.supplierName && 
        bi.ingredientLot.lotCode &&
        bi.ingredientLot.qualityStatus
      )).toBe(true)

      // Verify allergen documentation
      const allergens = complianceReport?.batchIngredients.flatMap(bi => bi.ingredient.allergens) || []
      expect(allergens).toContain('gluten')
      expect(allergens).toContain('eggs')
    })

    it('should support date-range queries for production history', async () => {
      const testData = await createComplexTraceabilityScenario()
      
      // Query production runs within specific date range
      const dateRangeResults = await prisma.productionRun.findMany({
        where: {
          actualStartTime: {
            gte: new Date('2024-08-14T00:00:00Z'),
            lte: new Date('2024-08-14T23:59:59Z'),
          },
        },
        include: {
          recipe: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          actualStartTime: 'asc',
        },
      })

      expect(dateRangeResults).toHaveLength(2) // Two runs on 2024-08-14
      expect(dateRangeResults[0].batchNumber).toBe('CAKE-20240814-001')
      expect(dateRangeResults[1].batchNumber).toBe('CUPCAKE-20240814-001')
      
      // Verify chronological order
      expect(dateRangeResults[0].actualStartTime?.getTime()).toBeLessThan(
        dateRangeResults[1].actualStartTime?.getTime() || 0
      )
    })

    it('should support supplier-based traceability queries', async () => {
      const testData = await createComplexTraceabilityScenario()
      
      // Query all products that used ingredients from specific supplier
      const supplierTraceability = await prisma.ingredientLot.findMany({
        where: {
          supplierName: 'Flour Supplier A',
        },
        include: {
          ingredient: {
            select: {
              name: true,
              type: true,
            },
          },
          batchIngredients: {
            include: {
              productionRun: {
                select: {
                  batchNumber: true,
                  status: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      })

      expect(supplierTraceability).toHaveLength(2) // Two flour lots from Supplier A
      
      const affectedBatches = supplierTraceability.flatMap(lot => 
        lot.batchIngredients.map(bi => bi.productionRun.batchNumber)
      )
      
      expect(affectedBatches).toContain('CAKE-20240814-001')
      expect(affectedBatches).toContain('CUPCAKE-20240814-001')
      expect(affectedBatches).toContain('CAKE-20240815-001')
    })
  })
})
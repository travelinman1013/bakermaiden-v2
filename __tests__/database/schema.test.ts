/**
 * Database Schema Tests
 * Tests for validating Prisma schema relationships, constraints, and traceability functionality
 */

import { PrismaClient } from '@prisma/client'
import { beforeAll, afterAll, beforeEach, describe, expect, it } from '@jest/globals'

let prisma: PrismaClient

beforeAll(async () => {
  // Use test database URL or in-memory database
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

describe('Database Schema Tests', () => {
  describe('Recipe Model', () => {
    it('should create a recipe with all fields', async () => {
      const recipe = await prisma.recipe.create({
        data: {
          name: 'Test Chocolate Cake',
          description: 'A delicious chocolate cake recipe',
          version: '2.0',
          isActive: true,
          createdBy: testUser.id,
        },
      })

      expect(recipe).toMatchObject({
        name: 'Test Chocolate Cake',
        description: 'A delicious chocolate cake recipe',
        version: '2.0',
        isActive: true,
        createdBy: testUser.id,
      })
      expect(recipe.id).toBeDefined()
      expect(recipe.createdAt).toBeDefined()
      expect(recipe.updatedAt).toBeDefined()
    })

    it('should enforce unique name constraint', async () => {
      await prisma.recipe.create({
        data: {
          name: 'Duplicate Recipe',
          createdBy: testUser.id,
        },
      })

      await expect(
        prisma.recipe.create({
          data: {
            name: 'Duplicate Recipe',
            createdBy: 2,
          },
        })
      ).rejects.toThrow()
    })

    it('should have default values', async () => {
      const recipe = await prisma.recipe.create({
        data: {
          name: 'Minimal Recipe',
        },
      })

      expect(recipe.version).toBe('1.0')
      expect(recipe.isActive).toBe(true)
    })
  })

  describe('Ingredient Model', () => {
    it('should create an ingredient with all fields', async () => {
      const ingredient = await prisma.ingredient.create({
        data: {
          name: 'Organic Flour',
          supplierName: 'Organic Mills Co',
          supplierCode: 'ORG-FLOUR-001',
          storageType: 'dry',
          shelfLifeDays: 365,
          allergens: ['wheat'],
          certifications: ['organic', 'non-GMO'],
          isActive: true,
        },
      })

      expect(ingredient.name).toBe('Organic Flour')
      expect(ingredient.supplierName).toBe('Organic Mills Co')
      expect(ingredient.supplierCode).toBe('ORG-FLOUR-001')
      expect(ingredient.storageType).toBe('dry')
      expect(ingredient.isActive).toBe(true)
      expect(ingredient.allergens).toEqual(['wheat'])
      expect(ingredient.certifications).toEqual(['organic', 'non-GMO'])
    })

    it('should enforce unique name constraint', async () => {
      await prisma.ingredient.create({
        data: {
          name: 'Sugar',
          supplierName: 'Sugar Supplier',
          storageType: 'dry',
        },
      })

      await expect(
        prisma.ingredient.create({
          data: {
            name: 'Sugar',
            supplierName: 'Sugar Supplier',
            storageType: 'dry',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('IngredientLot Model', () => {
    let ingredient: any

    beforeEach(async () => {
      ingredient = await prisma.ingredient.create({
        data: {
          name: 'Test Flour',
          supplierName: 'Test Supplier',
          storageType: 'dry',
        },
      })
    })

    it('should create an ingredient lot with full traceability data', async () => {
      const lot = await prisma.ingredientLot.create({
        data: {
          supplierLotCode: 'PFM-24081001',
          internalLotCode: 'INT-FL-001',
          quantityReceived: 500.0,
          quantityRemaining: 500.0,
          receivedDate: new Date('2024-08-14'),
          expirationDate: new Date('2025-08-14'),
          manufactureDate: new Date('2024-08-10'),
          qualityStatus: 'passed',
          storageLocation: 'Warehouse A, Section 3',
          ingredientId: ingredient.id,
        },
      })

      expect(lot.internalLotCode).toBe('INT-FL-001')
      expect(Number(lot.quantityReceived)).toBe(500.0)
      expect(lot.supplierLotCode).toBe('PFM-24081001')
      expect(lot.qualityStatus).toBe('passed')
    })

    it('should enforce unique internal lot code constraint', async () => {
      const internalLotCode = 'DUPLICATE-LOT-001'
      
      await prisma.ingredientLot.create({
        data: {
          supplierLotCode: 'SUP-001',
          internalLotCode,
          quantityReceived: 100.0,
          quantityRemaining: 100.0,
          receivedDate: new Date(),
          ingredientId: ingredient.id,
        },
      })

      await expect(
        prisma.ingredientLot.create({
          data: {
            supplierLotCode: 'SUP-002',
            internalLotCode,
            quantityReceived: 200.0,
            quantityRemaining: 200.0,
            receivedDate: new Date(),
            ingredientId: ingredient.id,
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('ProductionRun Model', () => {
    let recipe: any

    beforeEach(async () => {
      recipe = await prisma.recipe.create({
        data: {
          name: 'Test Production Recipe',
          createdBy: testUser.id,
        },
      })
    })

    it('should create a production run with comprehensive tracking', async () => {
      const productionRun = await prisma.productionRun.create({
        data: {
          dailyLot: 'DL-240814-01',
          cakeLot: 'CL-240814-01',
          icingLot: 'IL-240814-01',
          plannedQuantity: 100,
          actualQuantity: 98,
          startTime: new Date('2024-08-14T08:15:00Z'),
          endTime: new Date('2024-08-14T12:30:00Z'),
          equipmentStation: 'Line A',
          qualityStatus: 'passed',
          notes: 'Production went smoothly',
          temperature: 22.5,
          humidity: 55.0,
          recipeId: recipe.id,
        },
      })

      expect(productionRun.dailyLot).toBe('DL-240814-01')
      expect(Number(productionRun.actualQuantity)).toBe(98)
      expect(productionRun.qualityStatus).toBe('passed')
    })

    it('should create multiple production runs with different lots', async () => {
      const run1 = await prisma.productionRun.create({
        data: {
          dailyLot: 'DL-RUN-001',
          cakeLot: 'CL-RUN-001',
          icingLot: 'IL-RUN-001',
          plannedQuantity: 50,
          recipeId: recipe.id,
        },
      })

      const run2 = await prisma.productionRun.create({
        data: {
          dailyLot: 'DL-RUN-002',
          cakeLot: 'CL-RUN-002',
          icingLot: 'IL-RUN-002',
          plannedQuantity: 75,
          recipeId: recipe.id,
        },
      })

      expect(run1.dailyLot).toBe('DL-RUN-001')
      expect(run2.dailyLot).toBe('DL-RUN-002')
    })
  })

  describe('BatchIngredient Traceability Junction', () => {
    let recipe: any
    let ingredient: any
    let ingredientLot: any
    let productionRun: any

    beforeEach(async () => {
      recipe = await prisma.recipe.create({
        data: {
          name: 'Traceability Test Recipe',
          createdBy: testUser.id,
        },
      })

      ingredient = await prisma.ingredient.create({
        data: {
          name: 'Traceability Flour',
          supplierName: 'Trace Supplier',
          storageType: 'dry',
        },
      })

      ingredientLot = await prisma.ingredientLot.create({
        data: {
          supplierLotCode: 'TRACE-SUP-001',
          internalLotCode: 'TRACE-FLOUR-001',
          quantityReceived: 100.0,
          quantityRemaining: 100.0,
          receivedDate: new Date(),
          ingredientId: ingredient.id,
        },
      })

      productionRun = await prisma.productionRun.create({
        data: {
          dailyLot: 'DL-T-001',
          cakeLot: 'CL-T-001',
          icingLot: 'IL-T-001',
          plannedQuantity: 50,
          recipeId: recipe.id,
        },
      })
    })

    it('should create traceability link between production run and ingredient lot', async () => {
      const batchIngredient = await prisma.batchIngredient.create({
        data: {
          quantityUsed: 25.5,
          addedAt: new Date(),
          addedBy: testUser.id,
          notes: 'Added to main mixing bowl',
          productionRunId: productionRun.id,
          ingredientLotId: ingredientLot.id,
        },
      })

      expect(Number(batchIngredient.quantityUsed)).toBe(25.5)
      expect(batchIngredient.productionRunId).toBe(productionRun.id)
      expect(batchIngredient.ingredientLotId).toBe(ingredientLot.id)
    })

    it('should allow multiple batch ingredient records for same production run', async () => {
      // Create first batch ingredient record
      const batch1 = await prisma.batchIngredient.create({
        data: {
          quantityUsed: 10.0,
          productionRunId: productionRun.id,
          ingredientLotId: ingredientLot.id,
        },
      })

      // Create second batch ingredient record (different lot or time)
      const batch2 = await prisma.batchIngredient.create({
        data: {
          quantityUsed: 15.0,
          addedAt: new Date(Date.now() + 1000), // Different time
          productionRunId: productionRun.id,
          ingredientLotId: ingredientLot.id,
        },
      })

      expect(Number(batch1.quantityUsed)).toBe(10.0)
      expect(Number(batch2.quantityUsed)).toBe(15.0)
    })
  })

  describe('Pallet Model', () => {
    let recipe: any
    let productionRun: any

    beforeEach(async () => {
      recipe = await prisma.recipe.create({
        data: {
          name: 'Pallet Test Recipe',
          createdBy: testUser.id,
        },
      })

      productionRun = await prisma.productionRun.create({
        data: {
          dailyLot: 'DL-P-001',
          cakeLot: 'CL-P-001',
          icingLot: 'IL-P-001',
          plannedQuantity: 100,
          recipeId: recipe.id,
        },
      })
    })

    it('should create a pallet with tracking information', async () => {
      const pallet = await prisma.pallet.create({
        data: {
          palletCode: 'PAL-20240814-001',
          quantityPacked: 125.5,
          location: 'Warehouse B, Bay 15',
          shippingStatus: 'pending',
          productionRunId: productionRun.id,
        },
      })

      expect(pallet.palletCode).toBe('PAL-20240814-001')
      expect(Number(pallet.quantityPacked)).toBe(125.5)
      expect(pallet.location).toBe('Warehouse B, Bay 15')
      expect(pallet.shippingStatus).toBe('pending')
    })

    it('should allow multiple pallets with different codes', async () => {
      const pallet1 = await prisma.pallet.create({
        data: {
          palletCode: 'PALLET-001',
          productionRunId: productionRun.id,
        },
      })

      const pallet2 = await prisma.pallet.create({
        data: {
          palletCode: 'PALLET-002',
          productionRunId: productionRun.id,
        },
      })

      expect(pallet1.palletCode).toBe('PALLET-001')
      expect(pallet2.palletCode).toBe('PALLET-002')
      expect(pallet1.productionRunId).toBe(productionRun.id)
      expect(pallet2.productionRunId).toBe(productionRun.id)
    })

    it('should cascade delete when production run is deleted', async () => {
      const pallet = await prisma.pallet.create({
        data: {
          palletCode: 'CASCADE-TEST-001',
          productionRunId: productionRun.id,
        },
      })

      // Delete production run
      await prisma.productionRun.delete({
        where: { id: productionRun.id },
      })

      // Pallet should be deleted too
      const deletedPallet = await prisma.pallet.findUnique({
        where: { id: pallet.id },
      })
      expect(deletedPallet).toBeNull()
    })
  })

  describe('Full Traceability Chain', () => {
    it('should create complete traceability from ingredient lot to pallet', async () => {
      // Create recipe
      const recipe = await prisma.recipe.create({
        data: {
          name: 'Full Trace Recipe',
          description: 'Recipe for testing full traceability chain',
          createdBy: testUser.id,
        },
      })

      // Create ingredients
      const flour = await prisma.ingredient.create({
        data: {
          name: 'Trace Flour',
          supplierName: 'Flour Supplier',
          storageType: 'dry',
        },
      })

      const sugar = await prisma.ingredient.create({
        data: {
          name: 'Trace Sugar',
          supplierName: 'Sugar Supplier',
          storageType: 'dry',
        },
      })

      // Create ingredient lots
      const flourLot = await prisma.ingredientLot.create({
        data: {
          supplierLotCode: 'FTC-FLOUR-001',
          internalLotCode: 'FLOUR-FULL-TRACE-001',
          quantityReceived: 50.0,
          quantityRemaining: 25.0,
          receivedDate: new Date(),
          ingredientId: flour.id,
        },
      })

      const sugarLot = await prisma.ingredientLot.create({
        data: {
          supplierLotCode: 'TSC-SUGAR-001',
          internalLotCode: 'SUGAR-FULL-TRACE-001',
          quantityReceived: 20.0,
          quantityRemaining: 10.0,
          receivedDate: new Date(),
          ingredientId: sugar.id,
        },
      })

      // Create production run
      const productionRun = await prisma.productionRun.create({
        data: {
          dailyLot: 'FT-DL-001',
          cakeLot: 'FT-CL-001',
          icingLot: 'FT-IL-001',
          plannedQuantity: 48,
          actualQuantity: 46,
          qualityStatus: 'passed',
          recipeId: recipe.id,
        },
      })

      // Create batch ingredients (traceability links)
      await prisma.batchIngredient.create({
        data: {
          quantityUsed: 25.0,
          productionRunId: productionRun.id,
          ingredientLotId: flourLot.id,
          addedBy: testUser.id,
        },
      })

      await prisma.batchIngredient.create({
        data: {
          quantityUsed: 10.0,
          productionRunId: productionRun.id,
          ingredientLotId: sugarLot.id,
          addedBy: testUser.id,
        },
      })

      // Create pallets
      const pallet1 = await prisma.pallet.create({
        data: {
          palletCode: 'FT-PALLET-001',
          quantityPacked: 24,
          location: 'Warehouse A',
          productionRunId: productionRun.id,
        },
      })

      const pallet2 = await prisma.pallet.create({
        data: {
          palletCode: 'FT-PALLET-002',
          quantityPacked: 22,
          location: 'Warehouse B',
          productionRunId: productionRun.id,
        },
      })

      // Test full traceability query - forward tracing from ingredient lot
      const forwardTrace = await prisma.ingredientLot.findUnique({
        where: { id: flourLot.id },
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

      expect(forwardTrace?.internalLotCode).toBe('FLOUR-FULL-TRACE-001')
      expect(forwardTrace?.BatchIngredient).toHaveLength(1)
      expect(forwardTrace?.BatchIngredient[0].ProductionRun.dailyLot).toBe('FT-DL-001')
      expect(forwardTrace?.BatchIngredient[0].ProductionRun.Pallet).toHaveLength(2)

      // Test backward tracing from pallet
      const backwardTrace = await prisma.pallet.findUnique({
        where: { id: pallet1.id },
        include: {
          ProductionRun: {
            include: {
              Recipe: true,
              BatchIngredient: {
                include: {
                  IngredientLot: {
                    include: {
                      Ingredient: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      expect(backwardTrace?.palletCode).toBe('FT-PALLET-001')
      expect(backwardTrace?.ProductionRun.dailyLot).toBe('FT-DL-001')
      expect(backwardTrace?.ProductionRun.BatchIngredient).toHaveLength(2)
      
      const usedIngredients = backwardTrace?.ProductionRun.BatchIngredient.map(bi => bi.IngredientLot.Ingredient.name)
      expect(usedIngredients).toContain('Trace Flour')
      expect(usedIngredients).toContain('Trace Sugar')
    })
  })

  describe('Audit Log Model', () => {
    it('should create audit log entries', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          entityType: 'recipe',
          entityId: 1,
          action: 'create',
          changes: { name: 'New Recipe', description: 'Test recipe' },
          performedBy: testUser.id,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          reason: 'Creating new recipe for testing',
        },
      })

      expect(auditLog.entityType).toBe('recipe')
      expect(auditLog.action).toBe('create')
      expect(auditLog.performedBy).toBe(testUser.id)
      expect(auditLog.changes).toEqual({ name: 'New Recipe', description: 'Test recipe' })
    })

    it('should handle update audit logs with changes', async () => {
      const auditLog = await prisma.auditLog.create({
        data: {
          entityType: 'production_run',
          entityId: 5,
          action: 'update',
          changes: { 
            qualityStatus: { from: 'pending', to: 'passed' }, 
            actualQuantity: { from: null, to: 100 } 
          },
          performedBy: testUser.id,
          reason: 'Production completed successfully',
        },
      })

      expect(auditLog.action).toBe('update')
      expect(auditLog.changes).toEqual({ 
        qualityStatus: { from: 'pending', to: 'passed' }, 
        actualQuantity: { from: null, to: 100 } 
      })
    })
  })
})
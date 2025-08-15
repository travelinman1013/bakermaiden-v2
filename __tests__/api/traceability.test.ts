/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { GET as forwardTrace } from '@/app/api/traceability/forward/[ingredientLotId]/route'
import { GET as backwardTrace } from '@/app/api/traceability/backward/[palletId]/route'
import { GET as recallImpact } from '@/app/api/traceability/recall/[ingredientLotId]/route'
import { prisma } from '@/lib/db'

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    ingredientLot: {
      findUnique: jest.fn(),
    },
    productionRun: {
      findMany: jest.fn(),
    },
    pallet: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  withDatabaseErrorHandling: jest.fn((operation) => operation()),
}))

const mockPrisma = prisma as any

describe('/api/traceability', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/traceability/forward/[ingredientLotId]', () => {
    it('should perform forward traceability from ingredient lot to pallets', async () => {
      const mockIngredientLot = {
        id: 1,
        lotCode: 'FLOUR-001',
        supplierName: 'ABC Flour Co.',
        receivedDate: new Date('2023-01-01T10:00:00Z'),
        status: 'IN_USE',
        ingredient: {
          id: 1,
          name: 'All Purpose Flour',
          type: 'FLOUR',
          allergens: ['GLUTEN'],
        },
      }

      const mockProductionRuns = [
        {
          id: 1,
          batchNumber: 'BATCH001',
          dailyLot: 'DL001',
          cakeLot: 'CL001',
          icingLot: 'IL001',
          status: 'COMPLETED',
          plannedQuantity: 100,
          actualQuantity: 95,
          createdAt: new Date('2023-01-02T10:00:00Z'),
          recipe: {
            id: 1,
            name: 'Chocolate Cake',
            version: '1.0',
          },
          batchIngredients: [
            {
              quantityUsed: 50,
              unitOfMeasure: 'kg',
              addedAt: new Date('2023-01-02T10:30:00Z'),
              addedBy: 'operator1',
              ingredient: mockIngredientLot.ingredient,
              ingredientLot: mockIngredientLot,
            },
          ],
          pallets: [
            {
              id: 1,
              palletNumber: 'P001',
              weight: 150.5,
              itemCount: 24,
              location: 'Warehouse A',
              status: 'SHIPPED',
              shippedAt: new Date('2023-01-03T14:00:00Z'),
              customerOrder: 'ORD-12345',
            },
            {
              id: 2,
              palletNumber: 'P002',
              weight: 145.2,
              itemCount: 22,
              location: 'Cold Storage',
              status: 'ACTIVE',
              shippedAt: null,
              customerOrder: null,
            },
          ],
        },
      ]

      mockPrisma.ingredientLot.findUnique.mockResolvedValue(mockIngredientLot)
      mockPrisma.productionRun.findMany.mockResolvedValue(mockProductionRuns)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await forwardTrace(req as any, { params: { ingredientLotId: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.source.ingredientLot.lotCode).toBe('FLOUR-001')
      expect(responseData.impact.totalProductionRuns).toBe(1)
      expect(responseData.impact.totalPallets).toBe(2)
      expect(responseData.impact.shippedPallets).toBe(1)
      expect(responseData.impact.inventoryPallets).toBe(1)
      expect(responseData.impact.customerOrdersAffected).toBe(1)
      expect(responseData.traceabilityChain).toHaveLength(4) // ingredient lot + production run + 2 pallets
    })

    it('should return 404 for non-existent ingredient lot', async () => {
      mockPrisma.ingredientLot.findUnique.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await forwardTrace(req as any, { params: { ingredientLotId: '999' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.code).toBe('NOT_FOUND')
    })

    it('should handle invalid ingredient lot ID format', async () => {
      const { req } = createMocks({
        method: 'GET',
      })

      const response = await forwardTrace(req as any, { params: { ingredientLotId: 'invalid' } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.code).toBe('INVALID_ID')
    })
  })

  describe('GET /api/traceability/backward/[palletId]', () => {
    it('should perform backward traceability from pallet to ingredient lots', async () => {
      const mockPallet = {
        id: 1,
        palletNumber: 'P001',
        weight: 150.5,
        itemCount: 24,
        status: 'SHIPPED',
        location: 'Customer Site',
        customerOrder: 'ORD-12345',
        shippedAt: new Date('2023-01-03T14:00:00Z'),
        createdAt: new Date('2023-01-02T16:00:00Z'),
        productionRun: {
          id: 1,
          batchNumber: 'BATCH001',
          dailyLot: 'DL001',
          cakeLot: 'CL001',
          icingLot: 'IL001',
          status: 'COMPLETED',
          plannedQuantity: 100,
          actualQuantity: 95,
          primaryOperator: 'John Doe',
          createdAt: new Date('2023-01-02T10:00:00Z'),
          recipe: {
            id: 1,
            name: 'Chocolate Cake',
            version: '1.0',
            description: 'Rich chocolate cake with ganache',
          },
          batchIngredients: [
            {
              quantityUsed: 50,
              unitOfMeasure: 'kg',
              percentageOfTotal: 60,
              addedAt: new Date('2023-01-02T10:30:00Z'),
              addedBy: 'operator1',
              usageNotes: 'High quality flour',
              ingredient: {
                id: 1,
                name: 'All Purpose Flour',
                type: 'FLOUR',
                allergens: ['GLUTEN'],
                supplierCode: 'FLOUR-001',
                primarySupplier: 'ABC Flour Co.',
              },
              ingredientLot: {
                id: 1,
                lotCode: 'FLOUR-001-2023',
                internalLotCode: 'INT-F001',
                quantityReceived: 1000,
                quantityRemaining: 450,
                unitOfMeasure: 'kg',
                receivedDate: new Date('2023-01-01T10:00:00Z'),
                expirationDate: new Date('2024-01-01T10:00:00Z'),
                bestByDate: new Date('2023-12-01T10:00:00Z'),
                manufactureDate: new Date('2022-12-15T10:00:00Z'),
                supplierName: 'ABC Flour Co.',
                supplierLotCode: 'ABC-FLOUR-2022-50',
                invoiceNumber: 'INV-12345',
                purchaseOrder: 'PO-67890',
                qualityStatus: 'PASSED',
                status: 'IN_USE',
                storageLocation: 'Dry Storage A1',
              },
            },
            {
              quantityUsed: 25,
              unitOfMeasure: 'kg',
              percentageOfTotal: 40,
              addedAt: new Date('2023-01-02T11:00:00Z'),
              addedBy: 'operator1',
              usageNotes: 'Premium cocoa powder',
              ingredient: {
                id: 2,
                name: 'Cocoa Powder',
                type: 'FLAVORING',
                allergens: [],
                supplierCode: 'COCOA-001',
                primarySupplier: 'Cocoa Suppliers Ltd.',
              },
              ingredientLot: {
                id: 2,
                lotCode: 'COCOA-002-2023',
                internalLotCode: 'INT-C002',
                quantityReceived: 500,
                quantityRemaining: 225,
                unitOfMeasure: 'kg',
                receivedDate: new Date('2023-01-01T14:00:00Z'),
                expirationDate: new Date('2025-01-01T10:00:00Z'),
                bestByDate: null,
                manufactureDate: new Date('2022-12-20T10:00:00Z'),
                supplierName: 'Cocoa Suppliers Ltd.',
                supplierLotCode: 'CSL-COCOA-2022-25',
                invoiceNumber: 'INV-12346',
                purchaseOrder: 'PO-67891',
                qualityStatus: 'PASSED',
                status: 'IN_USE',
                storageLocation: 'Dry Storage B2',
              },
            },
          ],
        },
      }

      mockPrisma.pallet.findUnique.mockResolvedValue(mockPallet)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await backwardTrace(req as any, { params: { palletId: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.target.pallet.palletNumber).toBe('P001')
      expect(responseData.target.productionRun.batchNumber).toBe('BATCH001')
      expect(responseData.ingredientLots).toHaveLength(2)
      expect(responseData.traceabilityChain).toHaveLength(4) // pallet + production run + 2 ingredient lots
      expect(responseData.supplierAnalysis).toHaveLength(2)
      expect(responseData.summary.totalIngredientLots).toBe(2)
      expect(responseData.summary.totalSuppliers).toBe(2)
      expect(responseData.riskAssessment.totalRiskFactors).toBeGreaterThanOrEqual(0)
    })

    it('should identify risk factors in backward traceability', async () => {
      const mockPalletWithRisks = {
        id: 1,
        palletNumber: 'P001',
        createdAt: new Date('2023-01-02T16:00:00Z'),
        productionRun: {
          id: 1,
          batchNumber: 'BATCH001',
          createdAt: new Date('2023-01-02T10:00:00Z'),
          recipe: { id: 1, name: 'Test Recipe' },
          batchIngredients: [
            {
              ingredient: {
                name: 'Expired Flour',
                allergens: ['GLUTEN', 'NUTS'],
              },
              ingredientLot: {
                id: 1,
                lotCode: 'EXPIRED-001',
                expirationDate: new Date('2023-01-01T10:00:00Z'), // Expired
                qualityStatus: 'FAILED',
                status: 'RECALLED',
                receivedDate: new Date('2022-12-01T10:00:00Z'),
              },
              quantityUsed: 50,
              unitOfMeasure: 'kg',
            },
          ],
        },
      }

      mockPrisma.pallet.findUnique.mockResolvedValue(mockPalletWithRisks)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await backwardTrace(req as any, { params: { palletId: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.riskAssessment.riskFactors.length).toBeGreaterThan(0)
      
      const riskTypes = responseData.riskAssessment.riskFactors.map((risk: any) => risk.type)
      expect(riskTypes).toContain('EXPIRED_INGREDIENT')
      expect(riskTypes).toContain('QUALITY_FAILURE')
      expect(riskTypes).toContain('RECALLED_INGREDIENT')
      expect(riskTypes).toContain('ALLERGEN_PRESENT')
    })

    it('should return 404 for non-existent pallet', async () => {
      mockPrisma.pallet.findUnique.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await backwardTrace(req as any, { params: { palletId: '999' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.code).toBe('NOT_FOUND')
    })
  })

  describe('GET /api/traceability/recall/[ingredientLotId]', () => {
    it('should perform recall impact assessment', async () => {
      const mockIngredientLot = {
        id: 1,
        lotCode: 'CONTAMINATED-001',
        supplierName: 'Problem Supplier Inc.',
        receivedDate: new Date('2023-01-01T10:00:00Z'),
        status: 'RECALLED',
        ingredient: {
          id: 1,
          name: 'Contaminated Flour',
          type: 'FLOUR',
          allergens: ['GLUTEN'],
          primarySupplier: 'Problem Supplier Inc.',
        },
      }

      const mockProductionRuns = [
        {
          id: 1,
          batchNumber: 'BATCH001',
          dailyLot: 'DL001',
          recipeName: 'Chocolate Cake',
          status: 'COMPLETED',
          actualQuantity: 100,
          createdAt: new Date('2023-01-02T10:00:00Z'),
          recipe: {
            id: 1,
            name: 'Chocolate Cake',
            version: '1.0',
          },
          batchIngredients: [
            {
              quantityUsed: 50,
              unitOfMeasure: 'kg',
              addedAt: new Date('2023-01-02T11:00:00Z'),
              addedBy: 'operator1',
            },
          ],
          pallets: [
            {
              id: 1,
              palletNumber: 'P001',
              weight: 150,
              itemCount: 24,
              location: null,
              status: 'SHIPPED',
              shippedAt: new Date('2023-01-03T14:00:00Z'),
              customerOrder: 'ORD-12345',
              productionRun: {
                id: 1,
                batchNumber: 'BATCH001',
                dailyLot: 'DL001',
                recipeName: 'Chocolate Cake',
                createdAt: new Date('2023-01-02T10:00:00Z'),
              },
            },
            {
              id: 2,
              palletNumber: 'P002',
              weight: 145,
              itemCount: 22,
              location: 'Cold Storage',
              status: 'ACTIVE',
              shippedAt: null,
              customerOrder: null,
              productionRun: {
                id: 1,
                batchNumber: 'BATCH001',
                dailyLot: 'DL001',
                recipeName: 'Chocolate Cake',
                createdAt: new Date('2023-01-02T10:00:00Z'),
              },
            },
          ],
        },
        {
          id: 2,
          batchNumber: 'BATCH002',
          dailyLot: 'DL002',
          recipeName: 'Vanilla Cake',
          status: 'COMPLETED',
          actualQuantity: 80,
          createdAt: new Date('2023-01-05T10:00:00Z'), // More recent
          recipe: {
            id: 2,
            name: 'Vanilla Cake',
            version: '1.0',
          },
          batchIngredients: [
            {
              quantityUsed: 40,
              unitOfMeasure: 'kg',
              addedAt: new Date('2023-01-05T11:00:00Z'),
              addedBy: 'operator2',
            },
          ],
          pallets: [
            {
              id: 3,
              palletNumber: 'P003',
              weight: 120,
              itemCount: 18,
              location: null,
              status: 'SHIPPED',
              shippedAt: new Date('2023-01-06T09:00:00Z'),
              customerOrder: 'ORD-67890',
              productionRun: {
                id: 2,
                batchNumber: 'BATCH002',
                dailyLot: 'DL002',
                recipeName: 'Vanilla Cake',
                createdAt: new Date('2023-01-05T10:00:00Z'),
              },
            },
          ],
        },
      ]

      mockPrisma.ingredientLot.findUnique.mockResolvedValue(mockIngredientLot)
      mockPrisma.productionRun.findMany.mockResolvedValue(mockProductionRuns)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await recallImpact(req as any, { params: { ingredientLotId: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.recallTarget.ingredientLot.lotCode).toBe('CONTAMINATED-001')
      expect(responseData.impactSummary.totalProductionRuns).toBe(2)
      expect(responseData.impactSummary.totalPalletsAffected).toBe(3)
      expect(responseData.impactSummary.shippedProducts).toBe(2)
      expect(responseData.impactSummary.activeInventory).toBe(1)
      expect(responseData.impactSummary.customersAffected).toBe(2)

      // Check urgency assessment
      expect(responseData.urgencyAssessment.immediateAction.length).toBeGreaterThan(0)
      expect(responseData.urgencyAssessment.highPriority.length).toBeGreaterThan(0)

      // Check risk assessment
      expect(responseData.riskAssessment.totalRiskScore).toBeGreaterThan(0)
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(responseData.riskAssessment.riskLevel)

      // Check customer impact
      expect(responseData.customerImpact.length).toBe(2)
      expect(responseData.customerImpact[0].customerOrder).toBe('ORD-12345')
      expect(responseData.customerImpact[1].customerOrder).toBe('ORD-67890')

      // Check action plan
      expect(responseData.actionPlan.immediateActions.length).toBeGreaterThan(0)
      expect(responseData.actionPlan.notifications.customers).toBe(2)
      expect(responseData.actionPlan.inventory.activeInventoryPallets).toBe(1)

      // Verify response includes expiration time
      expect(responseData.generatedAt).toBeDefined()
      expect(responseData.expiresAt).toBeDefined()
    })

    it('should calculate high risk score for allergen-containing recalled ingredients', async () => {
      const mockIngredientLot = {
        id: 1,
        lotCode: 'NUT-ALLERGEN-001',
        ingredient: {
          name: 'Contaminated Nuts',
          type: 'NUTS',
          allergens: ['NUTS', 'TREE_NUTS'],
        },
        status: 'RECALLED',
      }

      const mockProductionRuns = [
        {
          id: 1,
          batchNumber: 'BATCH001',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago - recent
          recipe: { id: 1, name: 'Nut Cake' },
          batchIngredients: [{ quantityUsed: 10, unitOfMeasure: 'kg' }],
          pallets: Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            palletNumber: `P${String(i + 1).padStart(3, '0')}`,
            status: 'SHIPPED',
            customerOrder: `ORD-${i + 1}`,
            itemCount: 20,
          })), // 50 shipped pallets = high volume impact
        },
      ]

      mockPrisma.ingredientLot.findUnique.mockResolvedValue(mockIngredientLot)
      mockPrisma.productionRun.findMany.mockResolvedValue(mockProductionRuns)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await recallImpact(req as any, { params: { ingredientLotId: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.riskAssessment.totalRiskScore).toBeGreaterThan(80) // Should be CRITICAL
      expect(responseData.riskAssessment.riskLevel).toBe('CRITICAL')
      expect(responseData.riskAssessment.recommendedActions).toContain('IMMEDIATE_RECALL')
      expect(responseData.riskAssessment.recommendedActions).toContain('REGULATORY_NOTIFICATION')
      expect(responseData.riskAssessment.recommendedActions).toContain('MEDIA_ALERT')

      // Should show high urgency
      expect(responseData.urgencyAssessment.immediateAction.length).toBeGreaterThan(0)
    })

    it('should return 404 for non-existent ingredient lot', async () => {
      mockPrisma.ingredientLot.findUnique.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await recallImpact(req as any, { params: { ingredientLotId: '999' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.code).toBe('NOT_FOUND')
    })
  })
})
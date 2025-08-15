/**
 * @jest-environment node
 */

import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/production-runs/route'
import { GET as getById, PUT, DELETE } from '@/app/api/production-runs/[id]/route'
import { prisma } from '@/lib/db'

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    productionRun: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    recipe: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  withDatabaseErrorHandling: jest.fn((operation) => operation()),
}))

const mockPrisma = prisma as any

describe('/api/production-runs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/production-runs', () => {
    it('should return production runs with pagination', async () => {
      const mockProductionRuns = [
        {
          id: 1,
          batchNumber: 'BATCH001',
          dailyLot: 'DL001',
          cakeLot: 'CL001',
          icingLot: 'IL001',
          plannedQuantity: 100,
          actualQuantity: 95,
          status: 'COMPLETED',
          qualityStatus: 'PASSED',
          recipe: { id: 1, name: 'Chocolate Cake' },
          pallets: [],
          batchIngredients: [],
          createdAt: new Date('2023-01-01T10:00:00Z'),
        }
      ]

      mockPrisma.productionRun.findMany.mockResolvedValue(mockProductionRuns)
      mockPrisma.productionRun.count.mockResolvedValue(1)

      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/production-runs?page=1&limit=20',
      })

      await GET(req as any)

      expect(mockPrisma.productionRun.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('should handle search filtering', async () => {
      mockPrisma.productionRun.findMany.mockResolvedValue([])
      mockPrisma.productionRun.count.mockResolvedValue(0)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/production-runs?search=BATCH001',
      })

      await GET(req as any)

      expect(mockPrisma.productionRun.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { batchNumber: { contains: 'BATCH001', mode: 'insensitive' } },
            { dailyLot: { contains: 'BATCH001', mode: 'insensitive' } },
            { cakeLot: { contains: 'BATCH001', mode: 'insensitive' } },
            { icingLot: { contains: 'BATCH001', mode: 'insensitive' } },
            { primaryOperator: { contains: 'BATCH001', mode: 'insensitive' } },
            { productionNotes: { contains: 'BATCH001', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      })
    })

    it('should handle invalid pagination parameters', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/production-runs?page=0&limit=200',
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/production-runs', () => {
    it('should create a new production run', async () => {
      const mockRecipe = {
        id: 1,
        name: 'Chocolate Cake',
        isActive: true,
      }

      const mockProductionRun = {
        id: 1,
        batchNumber: 'BATCH001',
        dailyLot: 'DL001',
        cakeLot: 'CL001',
        icingLot: 'IL001',
        plannedQuantity: 100,
        recipeId: 1,
        status: 'PLANNED',
        qualityStatus: 'PENDING',
        recipe: mockRecipe,
        createdAt: new Date(),
      }

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe)
      mockPrisma.productionRun.findUnique.mockResolvedValue(null) // No existing batch
      mockPrisma.productionRun.create.mockResolvedValue(mockProductionRun)

      const { req } = createMocks({
        method: 'POST',
        body: {
          batchNumber: 'BATCH001',
          dailyLot: 'DL001',
          cakeLot: 'CL001',
          icingLot: 'IL001',
          plannedQuantity: 100,
          recipeId: 1,
        },
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(responseData.batchNumber).toBe('BATCH001')
      expect(mockPrisma.productionRun.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          batchNumber: 'BATCH001',
          recipeId: 1,
          status: 'PLANNED',
          qualityStatus: 'PENDING',
        }),
        include: { recipe: true },
      })
    })

    it('should reject duplicate batch numbers', async () => {
      const mockRecipe = {
        id: 1,
        name: 'Chocolate Cake',
        isActive: true,
      }

      const existingBatch = {
        id: 1,
        batchNumber: 'BATCH001',
      }

      mockPrisma.recipe.findUnique.mockResolvedValue(mockRecipe)
      mockPrisma.productionRun.findUnique.mockResolvedValue(existingBatch)

      const { req } = createMocks({
        method: 'POST',
        body: {
          batchNumber: 'BATCH001',
          dailyLot: 'DL001',
          cakeLot: 'CL001',
          icingLot: 'IL001',
          plannedQuantity: 100,
          recipeId: 1,
        },
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(409)
      expect(responseData.code).toBe('DUPLICATE_BATCH_NUMBER')
    })

    it('should reject invalid request body', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          batchNumber: '', // Invalid: empty string
          plannedQuantity: -1, // Invalid: negative number
        },
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/production-runs/[id]', () => {
    it('should return production run details', async () => {
      const mockProductionRun = {
        id: 1,
        batchNumber: 'BATCH001',
        recipe: { id: 1, name: 'Chocolate Cake' },
        pallets: [],
        batchIngredients: [],
      }

      mockPrisma.productionRun.findUnique.mockResolvedValue(mockProductionRun)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await getById(req as any, { params: { id: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.id).toBe(1)
      expect(responseData.batchNumber).toBe('BATCH001')
    })

    it('should return 404 for non-existent production run', async () => {
      mockPrisma.productionRun.findUnique.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
      })

      const response = await getById(req as any, { params: { id: '999' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.code).toBe('NOT_FOUND')
    })

    it('should handle invalid ID format', async () => {
      const { req } = createMocks({
        method: 'GET',
      })

      const response = await getById(req as any, { params: { id: 'invalid' } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.code).toBe('INVALID_ID')
    })
  })

  describe('PUT /api/production-runs/[id]', () => {
    it('should update production run', async () => {
      const existingRun = {
        id: 1,
        batchNumber: 'BATCH001',
        status: 'IN_PROGRESS',
        actualStartTime: null,
        actualEndTime: null,
      }

      const updatedRun = {
        ...existingRun,
        status: 'COMPLETED',
        actualQuantity: 95,
      }

      mockPrisma.productionRun.findUnique.mockResolvedValue(existingRun)
      mockPrisma.productionRun.update.mockResolvedValue(updatedRun)

      const { req } = createMocks({
        method: 'PUT',
        body: {
          status: 'COMPLETED',
          actualQuantity: 95,
        },
      })

      const response = await PUT(req as any, { params: { id: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.status).toBe('COMPLETED')
      expect(responseData.actualQuantity).toBe(95)
    })

    it('should prevent updates to completed batches', async () => {
      const existingRun = {
        id: 1,
        batchNumber: 'BATCH001',
        status: 'COMPLETED',
      }

      mockPrisma.productionRun.findUnique.mockResolvedValue(existingRun)

      const { req } = createMocks({
        method: 'PUT',
        body: {
          status: 'FAILED',
        },
      })

      const response = await PUT(req as any, { params: { id: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.code).toBe('UPDATE_FORBIDDEN')
    })

    it('should calculate duration from start and end times', async () => {
      const existingRun = {
        id: 1,
        batchNumber: 'BATCH001',
        status: 'IN_PROGRESS',
      }

      const updatedRun = {
        ...existingRun,
        actualStartTime: new Date('2023-01-01T10:00:00Z'),
        actualEndTime: new Date('2023-01-01T14:00:00Z'),
        durationMinutes: 240,
      }

      mockPrisma.productionRun.findUnique.mockResolvedValue(existingRun)
      mockPrisma.productionRun.update.mockResolvedValue(updatedRun)

      const { req } = createMocks({
        method: 'PUT',
        body: {
          actualStartTime: '2023-01-01T10:00:00Z',
          actualEndTime: '2023-01-01T14:00:00Z',
        },
      })

      const response = await PUT(req as any, { params: { id: '1' } })

      expect(mockPrisma.productionRun.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          durationMinutes: 240,
        }),
        include: expect.any(Object),
      })
    })
  })

  describe('DELETE /api/production-runs/[id]', () => {
    it('should archive production run by marking as FAILED', async () => {
      const existingRun = {
        id: 1,
        batchNumber: 'BATCH001',
        status: 'PLANNED',
        pallets: [],
        productionNotes: 'Original notes',
      }

      const archivedRun = {
        id: 1,
        batchNumber: 'BATCH001',
        status: 'FAILED',
        updatedAt: new Date(),
      }

      mockPrisma.productionRun.findUnique.mockResolvedValue(existingRun)
      mockPrisma.productionRun.update.mockResolvedValue(archivedRun)

      const { req } = createMocks({
        method: 'DELETE',
      })

      const response = await DELETE(req as any, { params: { id: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.message).toContain('archived successfully')
      expect(mockPrisma.productionRun.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'FAILED',
          productionNotes: expect.stringContaining('[ARCHIVED:'),
        }),
        select: expect.any(Object),
      })
    })

    it('should prevent deletion of completed production runs', async () => {
      const existingRun = {
        id: 1,
        batchNumber: 'BATCH001',
        status: 'COMPLETED',
        pallets: [],
      }

      mockPrisma.productionRun.findUnique.mockResolvedValue(existingRun)

      const { req } = createMocks({
        method: 'DELETE',
      })

      const response = await DELETE(req as any, { params: { id: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.code).toBe('DELETE_FORBIDDEN')
    })

    it('should prevent deletion when shipped pallets exist', async () => {
      const existingRun = {
        id: 1,
        batchNumber: 'BATCH001',
        status: 'PLANNED',
        pallets: [
          { id: 1, status: 'SHIPPED' },
          { id: 2, status: 'ACTIVE' },
        ],
      }

      mockPrisma.productionRun.findUnique.mockResolvedValue(existingRun)

      const { req } = createMocks({
        method: 'DELETE',
      })

      const response = await DELETE(req as any, { params: { id: '1' } })
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.code).toBe('DELETE_FORBIDDEN')
      expect(responseData.details.shippedPallets).toBe(1)
    })
  })
})
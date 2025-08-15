/**
 * @jest-environment node
 * 
 * PHASE 4: DATABASE & API VALIDATION TESTING
 * Critical Fix Validation: Ingredient Lots API Schema Alignment
 * 
 * This test validates the critical database schema fix:
 * - ✅ FIXED: status → qualityStatus field mapping
 * - ✅ FIXED: Query structure and field alignment
 * - ✅ FIXED: QualityStatus enum validation
 */

import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/ingredient-lots/route'
import { prisma } from '@/lib/db'

// Mock Prisma client for isolated testing
jest.mock('@/lib/db', () => ({
  prisma: {
    ingredientLot: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    ingredient: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  withDatabaseErrorHandling: jest.fn((operation) => operation()),
}))

const mockPrisma = prisma as any

describe('CRITICAL FIX VALIDATION: /api/ingredient-lots', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Database Schema Fix: status → qualityStatus', () => {
    it('should correctly map qualityStatus field in database queries', async () => {
      const mockIngredientLots = [
        {
          id: 1,
          lotCode: 'FLOUR-20250815-001',
          supplierLotCode: 'SUP-FL-2025-001',
          qualityStatus: 'passed', // ✅ CRITICAL: Using qualityStatus, not status
          receivedDate: new Date('2025-08-15'),
          expirationDate: new Date('2025-12-15'),
          quantity: 50,
          unit: 'kg',
          ingredient: {
            id: 1,
            name: 'All-Purpose Flour',
            category: 'FLOUR',
          },
        }
      ]

      mockPrisma.ingredientLot.findMany.mockResolvedValue(mockIngredientLots)
      mockPrisma.ingredientLot.count.mockResolvedValue(1)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/ingredient-lots',
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: API returns 200 and proper data structure
      expect(response.status).toBe(200)
      expect(responseData.data).toHaveLength(1)
      expect(responseData.data[0].qualityStatus).toBe('passed')
      
      // ✅ VALIDATION: Field mapping is correct in database query
      expect(mockPrisma.ingredientLot.findMany).toHaveBeenCalledWith({
        where: {},
        include: { ingredient: true },
        orderBy: { receivedDate: 'desc' },
        skip: 0,
        take: 50,
      })
    })

    it('should validate all QualityStatus enum values are accepted', async () => {
      const qualityStatusValues = ['pending', 'passed', 'failed', 'quarantined']
      
      for (const status of qualityStatusValues) {
        mockPrisma.ingredientLot.findMany.mockResolvedValue([])
        mockPrisma.ingredientLot.count.mockResolvedValue(0)

        const { req } = createMocks({
          method: 'GET',
          url: `/api/ingredient-lots?qualityStatus=${status}`,
        })

        const response = await GET(req as any)
        
        // ✅ VALIDATION: All valid quality status values return 200
        expect(response.status).toBe(200)
        
        // ✅ VALIDATION: Query filter is correctly applied
        expect(mockPrisma.ingredientLot.findMany).toHaveBeenCalledWith({
          where: { qualityStatus: status },
          include: { ingredient: true },
          orderBy: { receivedDate: 'desc' },
          skip: 0,
          take: 50,
        })
      }
    })

    it('should reject invalid qualityStatus values', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/ingredient-lots?qualityStatus=INVALID_STATUS',
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: Invalid quality status returns proper error
      expect(response.status).toBe(400)
      expect(responseData.code).toBe('VALIDATION_ERROR')
      expect(responseData.message).toContain('qualityStatus')
    })
  })

  describe('Production Workflow Integration Fix', () => {
    it('should create ingredient lot with correct qualityStatus field', async () => {
      const mockIngredient = {
        id: 1,
        name: 'All-Purpose Flour',
        category: 'FLOUR',
        isActive: true,
      }

      const mockCreatedLot = {
        id: 1,
        lotCode: 'FLOUR-20250815-001',
        supplierLotCode: 'SUP-FL-2025-001',
        qualityStatus: 'passed', // ✅ CRITICAL: Correct field name
        receivedDate: new Date('2025-08-15'),
        expirationDate: new Date('2025-12-15'),
        quantity: 50,
        unit: 'kg',
        ingredientId: 1,
        ingredient: mockIngredient,
        createdAt: new Date(),
      }

      mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient)
      mockPrisma.ingredientLot.findUnique.mockResolvedValue(null) // No duplicate
      mockPrisma.ingredientLot.create.mockResolvedValue(mockCreatedLot)

      const { req } = createMocks({
        method: 'POST',
        body: {
          lotCode: 'FLOUR-20250815-001',
          supplierLotCode: 'SUP-FL-2025-001',
          qualityStatus: 'passed', // ✅ CRITICAL: Using correct field name
          receivedDate: '2025-08-15',
          expirationDate: '2025-12-15',
          quantity: 50,
          unit: 'kg',
          ingredientId: 1,
        },
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: Ingredient lot creation works with qualityStatus
      expect(response.status).toBe(201)
      expect(responseData.qualityStatus).toBe('passed')
      
      // ✅ VALIDATION: Database create uses correct field mapping
      expect(mockPrisma.ingredientLot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          qualityStatus: 'passed', // ✅ CRITICAL: Correct field name
          lotCode: 'FLOUR-20250815-001',
          supplierLotCode: 'SUP-FL-2025-001',
        }),
        include: { ingredient: true },
      })
    })

    it('should handle production form compatibility with status=passed', async () => {
      // ✅ CRITICAL: This test validates the production form can now load ingredient lots
      // Previously failed due to field mismatch, now should work
      
      const mockIngredientLots = [
        {
          id: 1,
          lotCode: 'FLOUR-20250815-001',
          qualityStatus: 'passed', // ✅ FIXED: Correct field name
          quantity: 50,
          ingredient: { name: 'All-Purpose Flour' },
        },
        {
          id: 2,
          lotCode: 'SUGAR-20250815-001',
          qualityStatus: 'passed', // ✅ FIXED: Correct field name
          quantity: 25,
          ingredient: { name: 'Granulated Sugar' },
        }
      ]

      mockPrisma.ingredientLot.findMany.mockResolvedValue(mockIngredientLots)
      mockPrisma.ingredientLot.count.mockResolvedValue(2)

      // ✅ CRITICAL: Test the exact query pattern used by production form
      const { req } = createMocks({
        method: 'GET',
        url: '/api/ingredient-lots?qualityStatus=passed&limit=100',
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: Production form can now load passed ingredient lots
      expect(response.status).toBe(200)
      expect(responseData.data).toHaveLength(2)
      expect(responseData.data.every((lot: any) => lot.qualityStatus === 'passed')).toBe(true)
    })
  })

  describe('Query Performance and Structure Validation', () => {
    it('should handle complex filtering without schema errors', async () => {
      mockPrisma.ingredientLot.findMany.mockResolvedValue([])
      mockPrisma.ingredientLot.count.mockResolvedValue(0)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/ingredient-lots?search=flour&qualityStatus=passed&ingredientId=1&page=1&limit=25',
      })

      const response = await GET(req as any)

      // ✅ VALIDATION: Complex queries work without field name errors
      expect(response.status).toBe(200)
      
      // ✅ VALIDATION: Correct WHERE clause structure
      expect(mockPrisma.ingredientLot.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            { qualityStatus: 'passed' }, // ✅ CRITICAL: Correct field name
            { ingredientId: 1 },
            {
              OR: [
                { lotCode: { contains: 'flour', mode: 'insensitive' } },
                { supplierLotCode: { contains: 'flour', mode: 'insensitive' } },
                { ingredient: { name: { contains: 'flour', mode: 'insensitive' } } },
              ],
            },
          ],
        },
        include: { ingredient: true },
        orderBy: { receivedDate: 'desc' },
        skip: 0,
        take: 25,
      })
    })

    it('should validate response structure matches expected schema', async () => {
      const mockIngredientLot = {
        id: 1,
        lotCode: 'TEST-20250815-001',
        supplierLotCode: 'SUP-TEST-001',
        qualityStatus: 'passed', // ✅ CRITICAL: Correct field name
        receivedDate: new Date('2025-08-15'),
        expirationDate: new Date('2025-12-15'),
        manufactureDate: new Date('2025-08-10'),
        quantity: 100,
        unit: 'kg',
        costPerUnit: 2.50,
        storageLocation: 'A1-B2',
        temperatureRange: '18-22°C',
        qualityNotes: 'Passed all quality checks',
        ingredientId: 1,
        ingredient: {
          id: 1,
          name: 'Test Ingredient',
          category: 'FLOUR',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.ingredientLot.findMany.mockResolvedValue([mockIngredientLot])
      mockPrisma.ingredientLot.count.mockResolvedValue(1)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/ingredient-lots',
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: Response structure is complete and correct
      expect(response.status).toBe(200)
      expect(responseData).toHaveProperty('data')
      expect(responseData).toHaveProperty('pagination')
      expect(responseData.data[0]).toHaveProperty('qualityStatus', 'passed')
      expect(responseData.data[0]).toHaveProperty('lotCode')
      expect(responseData.data[0]).toHaveProperty('ingredient')
      expect(responseData.data[0].ingredient).toHaveProperty('name')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrisma.ingredientLot.findMany.mockRejectedValue(new Error('Database connection failed'))

      const { req } = createMocks({
        method: 'GET',
        url: '/api/ingredient-lots',
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: Database errors are handled properly
      expect(response.status).toBe(500)
      expect(responseData.code).toBe('DATABASE_ERROR')
    })

    it('should validate pagination parameters correctly', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/ingredient-lots?page=0&limit=1000', // Invalid values
      })

      const response = await GET(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: Invalid pagination is rejected
      expect(response.status).toBe(400)
      expect(responseData.code).toBe('VALIDATION_ERROR')
    })

    it('should handle missing ingredient reference gracefully', async () => {
      const mockIngredient = null // Ingredient doesn't exist

      mockPrisma.ingredient.findUnique.mockResolvedValue(mockIngredient)

      const { req } = createMocks({
        method: 'POST',
        body: {
          lotCode: 'TEST-20250815-001',
          qualityStatus: 'passed',
          ingredientId: 999, // Non-existent ingredient
          quantity: 50,
          unit: 'kg',
        },
      })

      const response = await POST(req as any)
      const responseData = await response.json()

      // ✅ VALIDATION: Missing ingredient reference is handled
      expect(response.status).toBe(404)
      expect(responseData.code).toBe('INGREDIENT_NOT_FOUND')
    })
  })
})
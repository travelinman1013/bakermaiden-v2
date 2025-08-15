/**
 * Jest Test Setup
 * Global configuration for database tests including environment setup and teardown
 */

import { PrismaClient } from '@prisma/client'

// Global test configuration
jest.setTimeout(60000) // 60 seconds timeout for all tests

// Database connection for global setup/teardown
let globalPrisma: PrismaClient

beforeAll(async () => {
  // Ensure we're using the test database
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL?.includes('test')) {
    console.warn('WARNING: No TEST_DATABASE_URL provided. Using main DATABASE_URL.')
    console.warn('This could affect production data. Please set TEST_DATABASE_URL.')
  }

  // Initialize global Prisma client
  globalPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error'],
  })

  try {
    await globalPrisma.$connect()
    console.log('Connected to test database successfully')

    // Verify database connection and schema
    await globalPrisma.$queryRaw`SELECT 1 as test`
    
    // Check if tables exist (basic schema validation)
    const tables = await globalPrisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `
    
    if (tables.length === 0) {
      console.warn('WARNING: No tables found in test database. Run "npx prisma db push" first.')
    } else {
      console.log(`Found ${tables.length} tables in test database`)
    }
  } catch (error) {
    console.error('Failed to connect to test database:', error)
    throw error
  }
})

afterAll(async () => {
  if (globalPrisma) {
    await globalPrisma.$disconnect()
    console.log('Disconnected from test database')
  }
})

// Global test utilities
global.testUtils = {
  // Helper to generate random test data
  randomString: (length: number = 10) => {
    return Math.random().toString(36).substring(2, length + 2)
  },
  
  // Helper to generate random dates
  randomDate: (daysBack: number = 30) => {
    const start = new Date()
    start.setDate(start.getDate() - daysBack)
    return new Date(start.getTime() + Math.random() * (Date.now() - start.getTime()))
  },
  
  // Helper to measure execution time
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> => {
    const start = Date.now()
    const result = await fn()
    const time = Date.now() - start
    return { result, time }
  },
  
  // Helper to create test lot codes
  generateLotCode: (prefix: string = 'TEST') => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `${prefix}-${date}-${random}`
  },
  
  // Helper to create test batch numbers
  generateBatchNumber: (prefix: string = 'BATCH') => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const sequence = Math.floor(Math.random() * 999).toString().padStart(3, '0')
    return `${prefix}-${date}-${sequence}`
  },
}

// Type declaration for global test utilities
declare global {
  var testUtils: {
    randomString: (length?: number) => string
    randomDate: (daysBack?: number) => Date
    measureTime: <T>(fn: () => Promise<T>) => Promise<{ result: T; time: number }>
    generateLotCode: (prefix?: string) => string
    generateBatchNumber: (prefix?: string) => string
  }
}

// Custom matchers for better test assertions
expect.extend({
  toBeWithinTimeRange(received: number, expected: number, tolerance: number = 100) {
    const pass = Math.abs(received - expected) <= tolerance
    if (pass) {
      return {
        message: () => `Expected ${received} not to be within ${tolerance}ms of ${expected}`,
        pass: true,
      }
    } else {
      return {
        message: () => `Expected ${received} to be within ${tolerance}ms of ${expected}`,
        pass: false,
      }
    }
  },
  
  toHaveExecutedWithin(received: number, maxTime: number) {
    const pass = received <= maxTime
    if (pass) {
      return {
        message: () => `Expected execution time ${received}ms not to be within ${maxTime}ms`,
        pass: true,
      }
    } else {
      return {
        message: () => `Expected execution time ${received}ms to be within ${maxTime}ms`,
        pass: false,
      }
    }
  },
})

// Type declaration for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinTimeRange(expected: number, tolerance?: number): R
      toHaveExecutedWithin(maxTime: number): R
    }
  }
}
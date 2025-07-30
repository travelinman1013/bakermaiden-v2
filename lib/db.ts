import { PrismaClient } from '@prisma/client'

// Global is used here to prevent re-instantiation of PrismaClient during hot reloads in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Database utility functions
export class DatabaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'DatabaseError'
  }
}

// Helper function to handle database operations with proper error handling
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`Database error in ${context}:`, error)
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2002':
          throw new DatabaseError('A record with this information already exists')
        case 'P2025':
          throw new DatabaseError('Record not found')
        case 'P2003':
          throw new DatabaseError('Related record not found')
        case 'P2016':
          throw new DatabaseError('Query interpretation error')
        default:
          throw new DatabaseError('Database operation failed', error)
      }
    }
    
    throw new DatabaseError('An unexpected database error occurred', error)
  }
}

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}
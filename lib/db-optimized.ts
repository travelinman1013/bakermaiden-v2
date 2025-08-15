import { PrismaClient, Prisma } from '@prisma/client'

// Connection pool health monitoring interface
interface ConnectionPoolHealth {
  isHealthy: boolean
  openConnections: number
  busyConnections: number
  idleConnections: number
  totalQueriesExecuted: number
  lastHealthCheck: Date
  averageQueryTime: number
  recentErrors: Array<{ timestamp: Date; error: string }>
}

// Circuit breaker states
enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitorWindow: number
}

class DatabaseCircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failures: number = 0
  private lastFailureTime: Date | null = null
  private successCount: number = 0
  
  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN
      } else {
        throw new Error('Circuit breaker is OPEN - database operations temporarily disabled')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private shouldAttemptReset(): boolean {
    return Boolean(this.lastFailureTime &&
           Date.now() - this.lastFailureTime.getTime() > this.config.recoveryTimeout)
  }

  private onSuccess(): void {
    this.failures = 0
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = new Date()
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
    }
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getFailureCount(): number {
    return this.failures
  }
}

class OptimizedDatabaseClient {
  private prisma: PrismaClient
  private circuitBreaker: DatabaseCircuitBreaker
  private healthMetrics: ConnectionPoolHealth
  private queryTimes: number[] = []
  private errors: Array<{ timestamp: Date; error: string }> = []

  constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      errorFormat: 'pretty',
    })

    this.circuitBreaker = new DatabaseCircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitorWindow: 60000,   // 1 minute
    })

    this.healthMetrics = {
      isHealthy: true,
      openConnections: 0,
      busyConnections: 0,
      idleConnections: 0,
      totalQueriesExecuted: 0,
      lastHealthCheck: new Date(),
      averageQueryTime: 0,
      recentErrors: []
    }

    this.setupEventListeners()
    this.startHealthMonitoring()
  }

  private setupEventListeners(): void {
    // @ts-ignore - Prisma event listeners have complex types
    this.prisma.$on('query', (e: any) => {
      this.healthMetrics.totalQueriesExecuted++
      this.queryTimes.push(e.duration || 0)
      
      // Keep only recent query times (last 100 queries)
      if (this.queryTimes.length > 100) {
        this.queryTimes = this.queryTimes.slice(-100)
      }
      
      this.updateAverageQueryTime()
    })

    // @ts-ignore - Prisma event listeners have complex types
    this.prisma.$on('error', (e: any) => {
      const error = { timestamp: new Date(), error: e.message || 'Unknown error' }
      this.errors.push(error)
      
      // Keep only recent errors (last 50)
      if (this.errors.length > 50) {
        this.errors = this.errors.slice(-50)
      }
      
      this.healthMetrics.recentErrors = this.errors
      this.healthMetrics.isHealthy = false
    })

    // @ts-ignore - Prisma event listeners have complex types
    this.prisma.$on('info', (e: any) => {
      // Parse connection pool info if available
      if (e.message && e.message.includes('postgresql pool with')) {
        const match = e.message.match(/postgresql pool with (\d+) connections/)
        if (match) {
          this.healthMetrics.openConnections = parseInt(match[1])
        }
      }
    })
  }

  private updateAverageQueryTime(): void {
    if (this.queryTimes.length > 0) {
      this.healthMetrics.averageQueryTime = 
        this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length
    }
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.updateConnectionPoolMetrics()
    }, 30000) // Check every 30 seconds
  }

  private async updateConnectionPoolMetrics(): Promise<void> {
    try {
      // Use metrics preview feature if available
      const metrics = await (this.prisma as any).$metrics?.json()
      
      if (metrics) {
        const poolConnections = metrics.gauges?.find((g: any) => g.key === 'prisma_pool_connections_open')
        const busyConnections = metrics.gauges?.find((g: any) => g.key === 'prisma_pool_connections_busy')
        const idleConnections = metrics.gauges?.find((g: any) => g.key === 'prisma_pool_connections_idle')
        
        if (poolConnections) this.healthMetrics.openConnections = poolConnections.value
        if (busyConnections) this.healthMetrics.busyConnections = busyConnections.value
        if (idleConnections) this.healthMetrics.idleConnections = idleConnections.value
      }
      
      // Basic health check
      await this.prisma.$queryRaw`SELECT 1`
      this.healthMetrics.isHealthy = true
      this.healthMetrics.lastHealthCheck = new Date()
      
    } catch (error) {
      this.healthMetrics.isHealthy = false
      console.error('Connection health check failed:', error)
    }
  }

  // Public method to execute queries with circuit breaker protection
  async executeQuery<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation)
  }

  // Public method to get connection health
  getConnectionHealth(): ConnectionPoolHealth {
    return { ...this.healthMetrics }
  }

  // Public method to get circuit breaker status
  getCircuitBreakerStatus() {
    return {
      state: this.circuitBreaker.getState(),
      failureCount: this.circuitBreaker.getFailureCount(),
      isOperational: this.circuitBreaker.getState() !== CircuitBreakerState.OPEN
    }
  }

  // Get the underlying Prisma client for direct access when needed
  getClient(): PrismaClient {
    return this.prisma
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }

  // Force reset circuit breaker (for admin use)
  resetCircuitBreaker(): void {
    this.circuitBreaker = new DatabaseCircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 30000,
      monitorWindow: 60000,
    })
  }
}

// Global instance management
const globalForOptimizedDb = globalThis as unknown as {
  optimizedDb: OptimizedDatabaseClient | undefined
}

export const optimizedDb = 
  globalForOptimizedDb.optimizedDb ??
  new OptimizedDatabaseClient()

if (process.env.NODE_ENV !== 'production') {
  globalForOptimizedDb.optimizedDb = optimizedDb
}

// Legacy compatibility - export the Prisma client directly
export const prisma = optimizedDb.getClient()

// Export types and utilities
export { CircuitBreakerState }
export type { ConnectionPoolHealth }

// Enhanced error handling for database operations
export class DatabaseConnectionError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message)
    this.name = 'DatabaseConnectionError'
  }
}

export async function withOptimizedDatabaseOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await optimizedDb.executeQuery(operation)
  } catch (error) {
    console.error(`Optimized database error in ${context}:`, error)
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2024':
          throw new DatabaseConnectionError('Connection pool timeout - system overloaded')
        case 'P2002':
          throw new DatabaseConnectionError('A record with this information already exists')
        case 'P2025':
          throw new DatabaseConnectionError('Record not found')
        case 'P2003':
          throw new DatabaseConnectionError('Related record not found')
        default:
          throw new DatabaseConnectionError('Database operation failed', error)
      }
    }
    
    throw new DatabaseConnectionError('An unexpected database error occurred', error)
  }
}

// Health check endpoint helper
export async function getDatabaseHealthReport() {
  const health = optimizedDb.getConnectionHealth()
  const circuitBreaker = optimizedDb.getCircuitBreakerStatus()
  
  return {
    timestamp: new Date().toISOString(),
    database: {
      isHealthy: health.isHealthy,
      lastHealthCheck: health.lastHealthCheck,
      connectionPool: {
        open: health.openConnections,
        busy: health.busyConnections,
        idle: health.idleConnections,
      },
      performance: {
        totalQueries: health.totalQueriesExecuted,
        averageQueryTime: health.averageQueryTime,
        recentErrorCount: health.recentErrors.length,
      }
    },
    circuitBreaker: {
      state: circuitBreaker.state,
      failureCount: circuitBreaker.failureCount,
      isOperational: circuitBreaker.isOperational,
    },
    recommendations: generatePerformanceRecommendations(health, circuitBreaker)
  }
}

function generatePerformanceRecommendations(
  health: ConnectionPoolHealth, 
  circuitBreaker: any
): string[] {
  const recommendations: string[] = []
  
  if (health.averageQueryTime > 500) {
    recommendations.push('High average query time detected - consider query optimization')
  }
  
  if (health.busyConnections / health.openConnections > 0.8) {
    recommendations.push('High connection pool utilization - consider increasing connection limit')
  }
  
  if (health.recentErrors.length > 10) {
    recommendations.push('High error rate detected - investigate recent database issues')
  }
  
  if (circuitBreaker.state === CircuitBreakerState.OPEN) {
    recommendations.push('Circuit breaker is OPEN - database operations are being blocked for recovery')
  }
  
  if (circuitBreaker.failureCount > 0) {
    recommendations.push(`Circuit breaker has ${circuitBreaker.failureCount} recent failures - monitor system health`)
  }
  
  return recommendations
}
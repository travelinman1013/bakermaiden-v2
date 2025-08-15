/**
 * Enhanced Database Configuration for Production Performance
 * Implements optimized connection pooling and performance monitoring
 */

// Production-optimized database configuration
export const OPTIMIZED_DATABASE_CONFIG = {
  // Connection Pool Settings (based on Supabase recommendations)
  CONNECTION_LIMIT: process.env.NODE_ENV === 'production' ? 20 : 10,
  POOL_TIMEOUT: process.env.NODE_ENV === 'production' ? 30 : 20, // seconds
  CONNECT_TIMEOUT: 30, // seconds
  
  // Query Performance Settings
  STATEMENT_TIMEOUT: 60000, // 60 seconds for complex queries
  IDLE_IN_TRANSACTION_SESSION_TIMEOUT: 10000, // 10 seconds
  
  // Logging and Monitoring
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'query' : 'error',
  METRICS_ENABLED: true,
  
  // Circuit Breaker Settings
  CIRCUIT_BREAKER: {
    FAILURE_THRESHOLD: process.env.NODE_ENV === 'production' ? 10 : 5,
    RECOVERY_TIMEOUT: process.env.NODE_ENV === 'production' ? 60000 : 30000, // ms
    MONITOR_WINDOW: 60000, // 1 minute
  },
  
  // Performance Thresholds
  PERFORMANCE_THRESHOLDS: {
    SLOW_QUERY_MS: process.env.NODE_ENV === 'production' ? 1000 : 500,
    CRITICAL_QUERY_MS: process.env.NODE_ENV === 'production' ? 5000 : 2000,
    MAX_ACCEPTABLE_RESPONSE_TIME: 50, // Target: sub-50ms for critical queries
  }
} as const

/**
 * Generate optimized database connection URL
 */
export function generateOptimizedConnectionUrl(baseUrl: string): string {
  const url = new URL(baseUrl)
  
  // Add optimized connection parameters
  url.searchParams.set('connection_limit', OPTIMIZED_DATABASE_CONFIG.CONNECTION_LIMIT.toString())
  url.searchParams.set('pool_timeout', OPTIMIZED_DATABASE_CONFIG.POOL_TIMEOUT.toString())
  url.searchParams.set('connect_timeout', OPTIMIZED_DATABASE_CONFIG.CONNECT_TIMEOUT.toString())
  url.searchParams.set('statement_timeout', `${OPTIMIZED_DATABASE_CONFIG.STATEMENT_TIMEOUT}ms`)
  url.searchParams.set('idle_in_transaction_session_timeout', `${OPTIMIZED_DATABASE_CONFIG.IDLE_IN_TRANSACTION_SESSION_TIMEOUT}ms`)
  
  // Add SSL settings for production
  if (process.env.NODE_ENV === 'production') {
    url.searchParams.set('sslmode', 'require')
  }
  
  return url.toString()
}

/**
 * Performance monitoring configuration for different query types
 */
export const QUERY_PERFORMANCE_TARGETS = {
  // Critical FDA compliance queries - must be fast
  CRITICAL: {
    target: 25, // ms
    warning: 50, // ms
    critical: 100, // ms
    timeout: 5000 // ms
  },
  
  // Standard CRUD operations
  STANDARD: {
    target: 50, // ms
    warning: 100, // ms
    critical: 500, // ms
    timeout: 10000 // ms
  },
  
  // Complex analytical queries
  ANALYTICAL: {
    target: 200, // ms
    warning: 500, // ms
    critical: 2000, // ms
    timeout: 30000 // ms
  },
  
  // Export and reporting queries
  REPORTING: {
    target: 1000, // ms
    warning: 5000, // ms
    critical: 15000, // ms
    timeout: 60000 // ms
  }
} as const

/**
 * Query categorization for performance monitoring
 */
export function categorizeQuery(operationName: string): keyof typeof QUERY_PERFORMANCE_TARGETS {
  const operation = operationName.toLowerCase()
  
  if (operation.includes('health') || operation.includes('traceability') || operation.includes('recall')) {
    return 'CRITICAL'
  }
  
  if (operation.includes('export') || operation.includes('report') || operation.includes('csv')) {
    return 'REPORTING'
  }
  
  if (operation.includes('stats') || operation.includes('analytics') || operation.includes('aggregate')) {
    return 'ANALYTICAL'
  }
  
  return 'STANDARD'
}

/**
 * Performance monitoring decorator
 */
export function withPerformanceMonitoring<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ result: T; performance: { duration: number; category: string; status: 'optimal' | 'warning' | 'critical' } }> {
  return new Promise(async (resolve, reject) => {
    const category = categorizeQuery(operationName)
    const thresholds = QUERY_PERFORMANCE_TARGETS[category]
    
    const start = performance.now()
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout: ${operationName} exceeded ${thresholds.timeout}ms`))
    }, thresholds.timeout)
    
    try {
      const result = await operation()
      clearTimeout(timeoutId)
      
      const duration = performance.now() - start
      
      // Determine performance status
      let status: 'optimal' | 'warning' | 'critical'
      if (duration <= thresholds.target) {
        status = 'optimal'
      } else if (duration <= thresholds.warning) {
        status = 'warning'
        console.warn(`[PERF WARNING] ${operationName} took ${duration.toFixed(2)}ms (target: ${thresholds.target}ms)`)
      } else {
        status = 'critical'
        console.error(`[PERF CRITICAL] ${operationName} took ${duration.toFixed(2)}ms (target: ${thresholds.target}ms, max acceptable: ${thresholds.warning}ms)`)
      }
      
      resolve({
        result,
        performance: {
          duration,
          category,
          status
        }
      })
    } catch (error) {
      clearTimeout(timeoutId)
      reject(error)
    }
  })
}

/**
 * Database health check configuration
 */
export const HEALTH_CHECK_CONFIG = {
  INTERVAL_MS: 30000, // Check every 30 seconds
  TIMEOUT_MS: 5000, // Health check timeout
  FAILURE_THRESHOLD: 3, // Consecutive failures before marking unhealthy
  RECOVERY_CHECKS: 2, // Consecutive successes needed to mark healthy again
  
  CHECKS: [
    {
      name: 'basic_connectivity',
      query: 'SELECT 1 as health_check',
      target_ms: 100,
      critical: true
    },
    {
      name: 'connection_pool_health',
      query: 'SELECT count(*) as connection_count FROM pg_stat_activity WHERE datname = current_database()',
      target_ms: 200,
      critical: true
    },
    {
      name: 'query_performance',
      query: 'SELECT count(*) FROM "ProductionRun" LIMIT 1',
      target_ms: 50,
      critical: false
    }
  ]
} as const

/**
 * Caching configuration for different data types
 */
export const CACHE_CONFIG = {
  // Static reference data (recipes, ingredients) - cache longer
  STATIC: {
    ttl: 300, // 5 minutes
    swr: 600, // 10 minutes stale-while-revalidate
  },
  
  // Dynamic production data - shorter cache
  DYNAMIC: {
    ttl: 30, // 30 seconds
    swr: 60, // 1 minute stale-while-revalidate
  },
  
  // Real-time data - minimal cache
  REALTIME: {
    ttl: 5, // 5 seconds
    swr: 10, // 10 seconds stale-while-revalidate
  },
  
  // Reports and exports - longer cache since they're expensive
  REPORTS: {
    ttl: 900, // 15 minutes
    swr: 1800, // 30 minutes stale-while-revalidate
  }
} as const
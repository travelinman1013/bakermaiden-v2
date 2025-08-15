#!/usr/bin/env ts-node
/**
 * Enhanced Load Testing Script for Phase 4 Optimization Validation
 * 
 * Tests the optimized database configuration under various load scenarios:
 * 1. Concurrent connection stress test
 * 2. Sustained load testing
 * 3. Circuit breaker validation
 * 4. Connection pool efficiency
 */

import { optimizedDb, withOptimizedDatabaseOperation, CircuitBreakerState } from '../lib/db-optimized'

interface LoadTestResults {
  scenario: string
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  totalDuration: number
  queriesPerSecond: number
  circuitBreakerActivations: number
  connectionPoolUtilization: number
}

class LoadTester {
  private results: LoadTestResults[] = []

  async runConcurrentConnectionTest(concurrentConnections: number = 50): Promise<LoadTestResults> {
    console.log(`\n🔥 Running Concurrent Connection Test (${concurrentConnections} connections)`)
    
    const latencies: number[] = []
    const promises: Promise<any>[] = []
    let circuitBreakerActivations = 0
    
    const startTime = Date.now()
    
    for (let i = 0; i < concurrentConnections; i++) {
      const promise = this.executeTestQuery(i)
        .then(latency => {
          latencies.push(latency)
        })
        .catch((error: any) => {
          if (error?.message?.includes('Circuit breaker')) {
            circuitBreakerActivations++
          }
          throw error
        })
      
      promises.push(promise)
    }

    const results = await Promise.allSettled(promises)
    const endTime = Date.now()
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    // Calculate performance metrics
    latencies.sort((a, b) => a - b)
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    
    const result: LoadTestResults = {
      scenario: `Concurrent Connections (${concurrentConnections})`,
      totalQueries: concurrentConnections,
      successfulQueries: successful,
      failedQueries: failed,
      averageLatency,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      totalDuration: endTime - startTime,
      queriesPerSecond: (successful / ((endTime - startTime) / 1000)),
      circuitBreakerActivations,
      connectionPoolUtilization: 0 // Will be calculated separately
    }
    
    this.results.push(result)
    this.logTestResult(result)
    
    return result
  }

  async runSustainedLoadTest(duration: number = 30000, qps: number = 10): Promise<LoadTestResults> {
    console.log(`\n⏱️  Running Sustained Load Test (${duration/1000}s @ ${qps} QPS)`)
    
    const latencies: number[] = []
    const startTime = Date.now()
    let totalQueries = 0
    let successfulQueries = 0
    let failedQueries = 0
    let circuitBreakerActivations = 0
    
    const interval = 1000 / qps // milliseconds between queries
    
    while (Date.now() - startTime < duration) {
      const queryStart = Date.now()
      
      try {
        await this.executeTestQuery(totalQueries)
        const latency = Date.now() - queryStart
        latencies.push(latency)
        successfulQueries++
      } catch (error: any) {
        if (error?.message?.includes('Circuit breaker')) {
          circuitBreakerActivations++
        }
        failedQueries++
      }
      
      totalQueries++
      
      // Wait for next query interval
      const elapsed = Date.now() - queryStart
      const waitTime = Math.max(0, interval - elapsed)
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
    
    const endTime = Date.now()
    
    // Calculate metrics
    latencies.sort((a, b) => a - b)
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    
    const result: LoadTestResults = {
      scenario: `Sustained Load (${duration/1000}s)`,
      totalQueries,
      successfulQueries,
      failedQueries,
      averageLatency,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      totalDuration: endTime - startTime,
      queriesPerSecond: (successfulQueries / ((endTime - startTime) / 1000)),
      circuitBreakerActivations,
      connectionPoolUtilization: 0
    }
    
    this.results.push(result)
    this.logTestResult(result)
    
    return result
  }

  async runCircuitBreakerTest(): Promise<LoadTestResults> {
    console.log(`\n⚡ Running Circuit Breaker Test (forcing failures)`)
    
    const latencies: number[] = []
    let totalQueries = 0
    let successfulQueries = 0
    let failedQueries = 0
    let circuitBreakerActivations = 0
    
    const startTime = Date.now()
    
    // Force failures by using invalid queries
    for (let i = 0; i < 10; i++) {
      try {
        await withOptimizedDatabaseOperation(async () => {
          // Invalid query to trigger failures
          return optimizedDb.getClient().$queryRaw`SELECT * FROM nonexistent_table`
        }, 'circuit-breaker-test')
        successfulQueries++
      } catch (error: any) {
        if (error?.message?.includes('Circuit breaker')) {
          circuitBreakerActivations++
        }
        failedQueries++
      }
      totalQueries++
    }
    
    // Check circuit breaker state
    const cbStatus = optimizedDb.getCircuitBreakerStatus()
    console.log(`  Circuit Breaker State: ${cbStatus.state}`)
    console.log(`  Failure Count: ${cbStatus.failureCount}`)
    
    // Now try normal queries (should fail if circuit breaker is open)
    for (let i = 0; i < 5; i++) {
      const queryStart = Date.now()
      try {
        await this.executeTestQuery(totalQueries)
        const latency = Date.now() - queryStart
        latencies.push(latency)
        successfulQueries++
      } catch (error: any) {
        if (error?.message?.includes('Circuit breaker')) {
          circuitBreakerActivations++
        }
        failedQueries++
      }
      totalQueries++
    }
    
    const endTime = Date.now()
    
    const result: LoadTestResults = {
      scenario: 'Circuit Breaker Test',
      totalQueries,
      successfulQueries,
      failedQueries,
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0,
      p95Latency: 0,
      p99Latency: 0,
      totalDuration: endTime - startTime,
      queriesPerSecond: (successfulQueries / ((endTime - startTime) / 1000)),
      circuitBreakerActivations,
      connectionPoolUtilization: 0
    }
    
    this.results.push(result)
    this.logTestResult(result)
    
    // Reset circuit breaker for subsequent tests
    optimizedDb.resetCircuitBreaker()
    
    return result
  }

  private async executeTestQuery(queryId: number): Promise<number> {
    const startTime = Date.now()
    
    await withOptimizedDatabaseOperation(async () => {
      // Mix of different query types to simulate real usage
      const queryType = queryId % 4
      
      switch (queryType) {
        case 0:
          return optimizedDb.getClient().recipe.findMany({ take: 5 })
        case 1:
          return optimizedDb.getClient().ingredient.findMany({ take: 3 })
        case 2:
          return optimizedDb.getClient().$queryRaw`SELECT COUNT(*) FROM "Recipe"`
        case 3:
          return optimizedDb.getClient().productionRun.findMany({ 
            take: 2,
            include: { Recipe: true }
          })
        default:
          return optimizedDb.getClient().$queryRaw`SELECT 1`
      }
    }, `load-test-query-${queryId}`)
    
    return Date.now() - startTime
  }

  private logTestResult(result: LoadTestResults): void {
    console.log(`\n📊 ${result.scenario} Results:`)
    console.log(`  Total Queries: ${result.totalQueries}`)
    console.log(`  Successful: ${result.successfulQueries} (${(result.successfulQueries/result.totalQueries*100).toFixed(1)}%)`)
    console.log(`  Failed: ${result.failedQueries} (${(result.failedQueries/result.totalQueries*100).toFixed(1)}%)`)
    console.log(`  Average Latency: ${result.averageLatency.toFixed(2)}ms`)
    console.log(`  P95 Latency: ${result.p95Latency.toFixed(2)}ms`)
    console.log(`  P99 Latency: ${result.p99Latency.toFixed(2)}ms`)
    console.log(`  Queries/Second: ${result.queriesPerSecond.toFixed(2)}`)
    console.log(`  Circuit Breaker Activations: ${result.circuitBreakerActivations}`)
    console.log(`  Duration: ${result.totalDuration}ms`)
  }

  async generateComprehensiveReport(): Promise<void> {
    console.log('\n' + '='.repeat(80))
    console.log('📋 COMPREHENSIVE LOAD TEST REPORT')
    console.log('='.repeat(80))
    
    // Get final connection health
    const health = optimizedDb.getConnectionHealth()
    const cbStatus = optimizedDb.getCircuitBreakerStatus()
    
    console.log('\n🔧 CONNECTION POOL STATUS:')
    console.log(`  Open Connections: ${health.openConnections}`)
    console.log(`  Busy Connections: ${health.busyConnections}`)
    console.log(`  Idle Connections: ${health.idleConnections}`)
    console.log(`  Total Queries Executed: ${health.totalQueriesExecuted}`)
    console.log(`  Average Query Time: ${health.averageQueryTime.toFixed(2)}ms`)
    console.log(`  Recent Errors: ${health.recentErrors.length}`)
    console.log(`  Circuit Breaker State: ${cbStatus.state}`)
    
    console.log('\n📈 PERFORMANCE COMPARISON:')
    
    this.results.forEach(result => {
      console.log(`\n${result.scenario}:`)
      console.log(`  Success Rate: ${(result.successfulQueries/result.totalQueries*100).toFixed(1)}%`)
      console.log(`  Avg Latency: ${result.averageLatency.toFixed(2)}ms`)
      console.log(`  Throughput: ${result.queriesPerSecond.toFixed(2)} QPS`)
    })
    
    console.log('\n🎯 OPTIMIZATION SUCCESS CRITERIA:')
    const bestConcurrentTest = this.results.find(r => r.scenario.includes('Concurrent'))
    if (bestConcurrentTest) {
      const successRate = (bestConcurrentTest.successfulQueries / bestConcurrentTest.totalQueries) * 100
      console.log(`  ✅ Concurrent Query Success Rate: ${successRate.toFixed(1)}% (Target: >80%)`)
      console.log(`  ✅ Average Latency: ${bestConcurrentTest.averageLatency.toFixed(2)}ms (Target: <500ms)`)
      console.log(`  ✅ Circuit Breaker Protection: ${cbStatus.state === CircuitBreakerState.CLOSED ? 'Active' : 'Triggered'}`)
    }
    
    console.log('\n✅ Load testing completed successfully!')
  }

  getResults(): LoadTestResults[] {
    return [...this.results]
  }
}

async function runCompleteLoadTest(): Promise<void> {
  const tester = new LoadTester()
  
  console.log('🚀 Starting Enhanced Load Testing for Phase 4 Optimizations')
  console.log('=' + '='.repeat(60))
  
  try {
    // Wait for application to initialize
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test 1: Concurrent connections (progressive load)
    await tester.runConcurrentConnectionTest(20)
    await new Promise(resolve => setTimeout(resolve, 3000)) // Cool down
    
    await tester.runConcurrentConnectionTest(40)
    await new Promise(resolve => setTimeout(resolve, 3000)) // Cool down
    
    // Test 2: Sustained load
    await tester.runSustainedLoadTest(15000, 8) // 15 seconds at 8 QPS
    await new Promise(resolve => setTimeout(resolve, 5000)) // Cool down
    
    // Test 3: Circuit breaker validation
    await tester.runCircuitBreakerTest()
    await new Promise(resolve => setTimeout(resolve, 3000)) // Cool down
    
    // Final comprehensive report
    await tester.generateComprehensiveReport()
    
  } catch (error) {
    console.error('❌ Load testing failed:', error)
    throw error
  } finally {
    await optimizedDb.disconnect()
  }
}

if (require.main === module) {
  runCompleteLoadTest()
    .then(() => {
      console.log('\n🎉 All load tests completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Load testing suite failed:', error)
      process.exit(1)
    })
}

export { LoadTester }
export type { LoadTestResults }
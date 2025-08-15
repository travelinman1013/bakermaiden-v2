#!/usr/bin/env ts-node
/**
 * Performance Baseline Measurement Script
 * 
 * Tests current database connection performance to establish baseline
 * metrics before applying optimizations.
 */

import { PrismaClient } from '@prisma/client'

interface ConnectionMetrics {
  connectionCount: number
  queryLatency: number[]
  concurrentQueryPerformance: {
    queries: number
    totalTime: number
    averageTime: number
    p95Time: number
    p99Time: number
  }
  connectionPoolHealth: any
}

async function measureBaseline(): Promise<ConnectionMetrics> {
  const prisma = new PrismaClient({
    log: ['info'],
  })

  console.log('🔍 Starting Performance Baseline Measurement...\n')

  // Test 1: Basic connection performance
  console.log('📊 Test 1: Basic Connection Latency')
  const latencyResults: number[] = []
  
  for (let i = 0; i < 10; i++) {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start
    latencyResults.push(latency)
    console.log(`  Query ${i + 1}: ${latency}ms`)
  }

  // Test 2: Concurrent query performance
  console.log('\n📊 Test 2: Concurrent Query Performance')
  const concurrentQueries = 20
  const queryPromises: Promise<any>[] = []
  
  const concurrentStart = Date.now()
  
  for (let i = 0; i < concurrentQueries; i++) {
    queryPromises.push(
      prisma.recipe.findMany({ take: 5 })
    )
  }

  const results = await Promise.allSettled(queryPromises)
  const concurrentEnd = Date.now()
  const concurrentTotalTime = concurrentEnd - concurrentStart
  
  const successfulQueries = results.filter(r => r.status === 'fulfilled').length
  const failedQueries = results.filter(r => r.status === 'rejected').length
  
  console.log(`  Concurrent queries: ${concurrentQueries}`)
  console.log(`  Successful: ${successfulQueries}`)
  console.log(`  Failed: ${failedQueries}`)
  console.log(`  Total time: ${concurrentTotalTime}ms`)
  console.log(`  Average per query: ${(concurrentTotalTime / successfulQueries).toFixed(2)}ms`)

  // Test 3: Connection pool metrics (if available)
  console.log('\n📊 Test 3: Connection Pool Metrics')
  let poolMetrics = null
  
  try {
    // Note: Metrics are preview feature
    poolMetrics = await (prisma as any).$metrics?.json()
    if (poolMetrics) {
      console.log('  Connection pool metrics available:')
      console.log(`  ${JSON.stringify(poolMetrics, null, 2)}`)
    } else {
      console.log('  Connection pool metrics not available (preview feature)')
    }
  } catch (error) {
    console.log('  Connection pool metrics not available:', error)
  }

  // Calculate statistics
  const sortedLatencies = latencyResults.sort((a, b) => a - b)
  const p95Index = Math.floor(sortedLatencies.length * 0.95)
  const p99Index = Math.floor(sortedLatencies.length * 0.99)

  const metrics: ConnectionMetrics = {
    connectionCount: 1, // Single connection for now
    queryLatency: latencyResults,
    concurrentQueryPerformance: {
      queries: successfulQueries,
      totalTime: concurrentTotalTime,
      averageTime: concurrentTotalTime / successfulQueries,
      p95Time: sortedLatencies[p95Index] || 0,
      p99Time: sortedLatencies[p99Index] || 0,
    },
    connectionPoolHealth: poolMetrics
  }

  await prisma.$disconnect()
  
  console.log('\n📋 BASELINE PERFORMANCE SUMMARY')
  console.log('================================')
  console.log(`Average Query Latency: ${(latencyResults.reduce((a, b) => a + b, 0) / latencyResults.length).toFixed(2)}ms`)
  console.log(`P95 Query Latency: ${metrics.concurrentQueryPerformance.p95Time}ms`)
  console.log(`P99 Query Latency: ${metrics.concurrentQueryPerformance.p99Time}ms`)
  console.log(`Concurrent Query Success Rate: ${(successfulQueries / concurrentQueries * 100).toFixed(1)}%`)
  console.log(`Concurrent Query Average Time: ${metrics.concurrentQueryPerformance.averageTime.toFixed(2)}ms`)

  return metrics
}

if (require.main === module) {
  measureBaseline()
    .then((metrics) => {
      console.log('\n✅ Baseline measurement completed successfully')
      console.log('📊 Raw metrics available for analysis')
    })
    .catch((error) => {
      console.error('❌ Baseline measurement failed:', error)
      process.exit(1)
    })
}

export { measureBaseline }
export type { ConnectionMetrics }
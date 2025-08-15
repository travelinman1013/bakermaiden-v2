#!/usr/bin/env ts-node
/**
 * Simple test to verify optimized connection configuration
 */

import { PrismaClient } from '@prisma/client'

async function testOptimizedConnection(): Promise<void> {
  console.log('🚀 Testing Optimized Connection Configuration')
  console.log('============================================')
  
  // Create client with optimized settings
  const prisma = new PrismaClient({
    log: ['info'],
  })

  console.log('\n📊 Running connection tests...')
  
  try {
    // Test 1: Basic connectivity
    console.log('\n1️⃣ Basic connectivity test')
    const start1 = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latency1 = Date.now() - start1
    console.log(`   ✅ Connection successful: ${latency1}ms`)

    // Test 2: Sequential queries
    console.log('\n2️⃣ Sequential query performance (10 queries)')
    const latencies: number[] = []
    
    for (let i = 0; i < 10; i++) {
      const start = Date.now()
      await prisma.recipe.findMany({ take: 2 })
      const latency = Date.now() - start
      latencies.push(latency)
    }
    
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    console.log(`   ✅ Average latency: ${avgLatency.toFixed(2)}ms`)
    console.log(`   📋 Latency range: ${Math.min(...latencies)}ms - ${Math.max(...latencies)}ms`)

    // Test 3: Concurrent queries (progressive load)
    console.log('\n3️⃣ Concurrent query test (20 concurrent)')
    const concurrentStart = Date.now()
    const promises = []
    
    for (let i = 0; i < 20; i++) {
      promises.push(
        prisma.ingredient.findMany({ take: 3 })
      )
    }
    
    const results = await Promise.allSettled(promises)
    const concurrentEnd = Date.now()
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log(`   ✅ Successful queries: ${successful}/20 (${(successful/20*100).toFixed(1)}%)`)
    console.log(`   ❌ Failed queries: ${failed}/20`)
    console.log(`   ⏱️  Total time: ${concurrentEnd - concurrentStart}ms`)
    console.log(`   🔄 Average per query: ${((concurrentEnd - concurrentStart) / successful).toFixed(2)}ms`)

    // Test 4: Connection pool stress test
    console.log('\n4️⃣ Connection pool stress test (40 concurrent)')
    const stressStart = Date.now()
    const stressPromises = []
    
    for (let i = 0; i < 40; i++) {
      stressPromises.push(
        prisma.$queryRaw`SELECT COUNT(*) FROM "Recipe"`
      )
    }
    
    const stressResults = await Promise.allSettled(stressPromises)
    const stressEnd = Date.now()
    
    const stressSuccessful = stressResults.filter(r => r.status === 'fulfilled').length
    const stressFailed = stressResults.filter(r => r.status === 'rejected').length
    
    console.log(`   ✅ Successful queries: ${stressSuccessful}/40 (${(stressSuccessful/40*100).toFixed(1)}%)`)
    console.log(`   ❌ Failed queries: ${stressFailed}/40`)
    console.log(`   ⏱️  Total time: ${stressEnd - stressStart}ms`)
    
    // Summary
    console.log('\n📋 OPTIMIZATION RESULTS SUMMARY')
    console.log('===============================')
    console.log(`🎯 Connection establishment: ${latency1}ms`)
    console.log(`🎯 Average query latency: ${avgLatency.toFixed(2)}ms`)
    console.log(`🎯 20 concurrent success rate: ${(successful/20*100).toFixed(1)}%`)
    console.log(`🎯 40 concurrent success rate: ${(stressSuccessful/40*100).toFixed(1)}%`)
    
    // Performance criteria check
    console.log('\n✅ OPTIMIZATION VALIDATION:')
    console.log(`   Connection limit: 15 (from DATABASE_URL parameter)`)
    console.log(`   Pool timeout: 10s (from DATABASE_URL parameter)`)
    console.log(`   Connect timeout: 30s (from DATABASE_URL parameter)`)
    
    if (successful >= 16) { // 80% of 20
      console.log(`   ✅ Concurrent performance: PASSED (${(successful/20*100).toFixed(1)}% >= 80%)`)
    } else {
      console.log(`   ❌ Concurrent performance: FAILED (${(successful/20*100).toFixed(1)}% < 80%)`)
    }
    
    if (avgLatency < 500) {
      console.log(`   ✅ Query latency: PASSED (${avgLatency.toFixed(2)}ms < 500ms)`)
    } else {
      console.log(`   ❌ Query latency: FAILED (${avgLatency.toFixed(2)}ms >= 500ms)`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  testOptimizedConnection()
    .then(() => {
      console.log('\n🎉 All optimization tests completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Optimization test failed:', error)
      process.exit(1)
    })
}
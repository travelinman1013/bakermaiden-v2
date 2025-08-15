import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseHealthReport } from '@/lib/db-optimized'

/**
 * Database Health Monitoring API - ENHANCED FOR PHASE 4
 * 
 * GET /api/health - Returns comprehensive database health status
 * 
 * Provides real-time monitoring of:
 * - Database connection pool status
 * - Query performance metrics
 * - Circuit breaker state
 * - Performance recommendations
 */

export async function GET(request: NextRequest) {
  try {
    const healthReport = await getDatabaseHealthReport()
    
    // Determine overall health status
    const isHealthy = healthReport.database.isHealthy && 
                     healthReport.circuitBreaker.isOperational
    
    const response = {
      status: isHealthy ? 'healthy' : 'degraded',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0',
      ...healthReport
    }
    
    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('Enhanced health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '0.1.0'
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}

// OPTIONS handler for CORS if needed
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
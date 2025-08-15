import { NextRequest, NextResponse } from 'next/server'

export interface AuthContext {
  userId: string
  userEmail: string
  userRole: string
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Extract authentication context from request headers
 * For MVP, this is a simple implementation - in production, this would integrate with your auth provider
 */
export function getAuthContext(request: NextRequest): AuthContext {
  // Check for Authorization header
  const authorization = request.headers.get('authorization')
  
  if (!authorization) {
    throw new AuthError('Authorization header missing')
  }
  
  // Simple token-based auth for MVP - replace with proper JWT validation in production
  if (authorization === 'Bearer demo-token') {
    return {
      userId: 'demo-user',
      userEmail: 'demo@bakermaiden.com',
      userRole: 'operator'
    }
  }
  
  if (authorization === 'Bearer admin-token') {
    return {
      userId: 'admin-user',
      userEmail: 'admin@bakermaiden.com',
      userRole: 'admin'
    }
  }
  
  throw new AuthError('Invalid authorization token')
}

/**
 * Middleware to protect API routes with authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, context: AuthContext, ...args: T) => Promise<NextResponse>,
  options: { requiredRole?: string } = {}
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const authContext = getAuthContext(request)
      
      // Check role-based access if required
      if (options.requiredRole && authContext.userRole !== options.requiredRole && authContext.userRole !== 'admin') {
        throw new AuthError(`Access denied. Required role: ${options.requiredRole}`, 403)
      }
      
      return await handler(request, authContext, ...args)
    } catch (error) {
      console.error('Authentication error:', error)
      
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: error.message,
            code: 'AUTH_ERROR'
          },
          { status: error.statusCode }
        )
      }
      
      return NextResponse.json(
        {
          error: 'Authentication failed',
          code: 'AUTH_ERROR'
        },
        { status: 401 }
      )
    }
  }
}

/**
 * Get user ID from authentication context for audit logging
 */
export function getCurrentUserId(authContext: AuthContext): string {
  return authContext.userId
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(authContext: AuthContext): boolean {
  return authContext.userRole === 'admin'
}

/**
 * Check if user can modify production data
 */
export function canModifyProduction(authContext: AuthContext): boolean {
  return authContext.userRole === 'admin' || authContext.userRole === 'operator'
}

/**
 * Check if user can access traceability data (sensitive for recalls)
 */
export function canAccessTraceability(authContext: AuthContext): boolean {
  return authContext.userRole === 'admin' || authContext.userRole === 'operator' || authContext.userRole === 'quality_control'
}
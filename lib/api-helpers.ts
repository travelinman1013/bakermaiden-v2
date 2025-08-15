import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { DatabaseError } from './db'
import { AuthError } from './auth'

// Standardized API error codes
export const API_ERROR_CODES = {
  // Authentication & Authorization
  AUTH_ERROR: 'AUTH_ERROR',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ID: 'INVALID_ID',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  
  // Resource Management
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_BATCH_NUMBER: 'DUPLICATE_BATCH_NUMBER',
  RECIPE_NOT_FOUND: 'RECIPE_NOT_FOUND',
  RECIPE_INACTIVE: 'RECIPE_INACTIVE',
  
  // Business Logic
  UPDATE_FORBIDDEN: 'UPDATE_FORBIDDEN',
  DELETE_FORBIDDEN: 'DELETE_FORBIDDEN',
  
  // System Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  FETCH_ERROR: 'FETCH_ERROR',
  CREATE_ERROR: 'CREATE_ERROR',
  UPDATE_ERROR: 'UPDATE_ERROR',
  DELETE_ERROR: 'DELETE_ERROR',
  TRACEABILITY_ERROR: 'TRACEABILITY_ERROR',
  RECALL_ASSESSMENT_ERROR: 'RECALL_ASSESSMENT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES]

export interface ApiError {
  error: string
  code: ApiErrorCode
  details?: any
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiResponse<T> {
  data: T
  pagination?: PaginationMeta
  summary?: Record<string, any>
}

/**
 * Create standardized pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

/**
 * Create standardized success response
 */
export function createApiResponse<T>(
  data: T,
  pagination?: PaginationMeta,
  summary?: Record<string, any>
): ApiResponse<T> {
  const response: ApiResponse<T> = { data }
  
  if (pagination) {
    response.pagination = pagination
  }
  
  if (summary) {
    response.summary = summary
  }
  
  return response
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  code: ApiErrorCode,
  details?: any,
  status: number = 500
): NextResponse {
  const errorResponse: ApiError = {
    error,
    code,
  }
  
  if (details) {
    errorResponse.details = details
  }
  
  return NextResponse.json(errorResponse, { status })
}

/**
 * Extract and validate pagination parameters from request
 */
export function extractPaginationParams(
  request: NextRequest,
  defaultPage: number = 1,
  defaultLimit: number = 20,
  maxLimit: number = 100
): PaginationParams {
  const { searchParams } = new URL(request.url)
  
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaultPage)))
  const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit))))
  
  return { page, limit }
}

/**
 * Extract search parameters from request
 */
export function extractSearchParams(request: NextRequest): Record<string, string | undefined> {
  const { searchParams } = new URL(request.url)
  
  return {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    type: searchParams.get('type') || undefined,
    supplier: searchParams.get('supplier') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
  }
}

/**
 * Validate integer ID parameter
 */
export function validateIdParam(id: string, paramName: string = 'ID'): number {
  const numericId = parseInt(id)
  
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error(`Invalid ${paramName}`)
  }
  
  return numericId
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  console.error(`API Error in ${context}:`, error)
  
  // Validation errors (Zod)
  if (error instanceof ZodError) {
    return createErrorResponse(
      'Invalid request data',
      API_ERROR_CODES.VALIDATION_ERROR,
      error.flatten(),
      400
    )
  }
  
  // Authentication errors
  if (error instanceof AuthError) {
    return createErrorResponse(
      error.message,
      API_ERROR_CODES.AUTH_ERROR,
      undefined,
      error.statusCode
    )
  }
  
  // Database errors
  if (error instanceof DatabaseError) {
    return createErrorResponse(
      error.message,
      API_ERROR_CODES.DATABASE_ERROR,
      undefined,
      500
    )
  }
  
  // Standard errors with known patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    
    // ID validation errors
    if (message.includes('invalid') && message.includes('id')) {
      return createErrorResponse(
        error.message,
        API_ERROR_CODES.INVALID_ID,
        undefined,
        400
      )
    }
    
    // Time range validation
    if (message.includes('time') && (message.includes('after') || message.includes('before'))) {
      return createErrorResponse(
        error.message,
        API_ERROR_CODES.INVALID_TIME_RANGE,
        undefined,
        400
      )
    }
    
    // Business logic errors
    if (message.includes('cannot update')) {
      return createErrorResponse(
        error.message,
        API_ERROR_CODES.UPDATE_FORBIDDEN,
        undefined,
        403
      )
    }
    
    if (message.includes('cannot delete')) {
      return createErrorResponse(
        error.message,
        API_ERROR_CODES.DELETE_FORBIDDEN,
        undefined,
        403
      )
    }
    
    // Not found errors
    if (message.includes('not found')) {
      return createErrorResponse(
        error.message,
        API_ERROR_CODES.NOT_FOUND,
        undefined,
        404
      )
    }
    
    // Duplicate errors
    if (message.includes('already exists') || message.includes('duplicate')) {
      return createErrorResponse(
        error.message,
        API_ERROR_CODES.DUPLICATE_BATCH_NUMBER,
        undefined,
        409
      )
    }
  }
  
  // Fallback for unknown errors
  return createErrorResponse(
    'An unexpected error occurred',
    API_ERROR_CODES.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development' ? String(error) : undefined,
    500
  )
}

/**
 * Wrapper for API route handlers with consistent error handling
 */
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  context: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error, context)
    }
  }
}

/**
 * Type-safe request body parser with validation
 */
export async function parseRequestBody<T>(
  request: NextRequest,
  validator: { safeParse: (data: any) => { success: boolean; data?: T; error?: any } }
): Promise<T> {
  const body = await request.json()
  const validation = validator.safeParse(body)
  
  if (!validation.success) {
    throw validation.error
  }
  
  return validation.data!
}

/**
 * Calculate skip value for database pagination
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit
}

/**
 * Validate date range parameters
 */
export function validateDateRange(dateFrom?: string, dateTo?: string): {
  dateFromObj?: Date
  dateToObj?: Date
} {
  let dateFromObj: Date | undefined
  let dateToObj: Date | undefined
  
  if (dateFrom) {
    dateFromObj = new Date(dateFrom)
    if (isNaN(dateFromObj.getTime())) {
      throw new Error('Invalid dateFrom format')
    }
  }
  
  if (dateTo) {
    dateToObj = new Date(dateTo)
    if (isNaN(dateToObj.getTime())) {
      throw new Error('Invalid dateTo format')
    }
  }
  
  if (dateFromObj && dateToObj && dateFromObj >= dateToObj) {
    throw new Error('dateTo must be after dateFrom')
  }
  
  return { dateFromObj, dateToObj }
}

/**
 * Log API request for monitoring
 */
export function logApiRequest(
  method: string,
  url: string,
  startTime: number,
  statusCode: number,
  userId?: string
): void {
  const duration = Date.now() - startTime
  
  console.log(`API ${method} ${url} - ${statusCode} - ${duration}ms${userId ? ` - User: ${userId}` : ''}`)
  
  // In production, you would send this to your monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to monitoring service
    // monitoring.track('api_request', { method, url, duration, statusCode, userId })
  }
}

/**
 * CORS headers for API responses
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  // Allow specific origins in production
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? ['https://your-production-domain.com']
    : ['http://localhost:3000', 'http://localhost:3001']
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0])
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  
  return response
}

/**
 * Options handler for CORS preflight requests
 */
export function handleOptionsRequest(): NextResponse {
  const response = new NextResponse(null, { status: 200 })
  return addCorsHeaders(response)
}
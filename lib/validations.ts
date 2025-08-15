import { z } from 'zod'

// Enums for validation (aligned with Prisma schema)
export const QualityStatus = z.enum(['pending', 'passed', 'failed', 'quarantined'])
export const StorageType = z.enum(['dry', 'refrigerated', 'frozen'])
export const AllergenType = z.enum(['milk', 'eggs', 'wheat', 'soy', 'nuts', 'peanuts', 'sesame', 'fish', 'shellfish'])
export const AuditAction = z.enum(['create', 'update', 'delete', 'archive'])
export const AuditEntity = z.enum(['recipe', 'production_run', 'ingredient', 'ingredient_lot', 'pallet', 'user'])

// Additional enums referenced in schemas
export const BatchStatus = z.enum(['planned', 'in_progress', 'completed', 'on_hold', 'cancelled'])

// Recipe validation schemas
export const createRecipeSchema = z.object({
  name: z
    .string()
    .min(1, 'Recipe name is required')
    .max(100, 'Recipe name must be 100 characters or less')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .nullable(),
  version: z
    .string()
    .max(10, 'Version must be 10 characters or less')
    .default('1.0'),
  isActive: z
    .boolean()
    .default(true),
  yieldQuantity: z
    .number()
    .positive('Yield quantity must be positive')
    .optional()
    .nullable(),
  yieldUnit: z
    .string()
    .max(20, 'Yield unit must be 20 characters or less')
    .default('units')
    .optional(),
  createdBy: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
})

export const updateRecipeSchema = z.object({
  name: z
    .string()
    .min(1, 'Recipe name is required')
    .max(100, 'Recipe name must be 100 characters or less')
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or less')
    .optional()
    .nullable(),
  version: z
    .string()
    .max(10, 'Version must be 10 characters or less')
    .optional(),
  isActive: z
    .boolean()
    .optional(),
  yieldQuantity: z
    .number()
    .positive('Yield quantity must be positive')
    .optional()
    .nullable(),
  yieldUnit: z
    .string()
    .max(20, 'Yield unit must be 20 characters or less')
    .optional(),
  updatedBy: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable()
})

export const recipeIdSchema = z.object({
  id: z.string().min(1, 'Recipe ID is required')
})

// Production Run validation schemas (aligned with Prisma schema)
export const createProductionRunSchema = z.object({
  dailyLot: z
    .string()
    .min(1, 'Daily lot is required')
    .max(50, 'Daily lot must be 50 characters or less'),
  cakeLot: z
    .string()
    .min(1, 'Cake lot is required')
    .max(50, 'Cake lot must be 50 characters or less'),
  icingLot: z
    .string()
    .min(1, 'Icing lot is required')
    .max(50, 'Icing lot must be 50 characters or less'),
  plannedQuantity: z
    .number()
    .min(1, 'Planned quantity must be at least 1'),
  recipeId: z
    .number()
    .min(1, 'Recipe ID is required'),
  startTime: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  primaryOperatorId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  assistantOperatorId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  inspectorId: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  equipmentStation: z
    .string()
    .max(100, 'Equipment station must be 100 characters or less')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or less')
    .optional()
    .nullable()
})

export const updateProductionRunSchema = z.object({
  actualQuantity: z
    .number()
    .min(0, 'Actual quantity cannot be negative')
    .optional(),
  startTime: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  endTime: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  qualityStatus: QualityStatus.optional(),
  notes: z
    .string()
    .max(2000, 'Notes must be 2000 characters or less')
    .optional()
    .nullable(),
  temperature: z
    .number()
    .min(-50, 'Temperature must be above -50°C')
    .max(200, 'Temperature must be below 200°C')
    .optional(),
  humidity: z
    .number()
    .min(0, 'Humidity cannot be negative')
    .max(100, 'Humidity cannot exceed 100%')
    .optional()
})

// Ingredient validation schemas
export const createIngredientSchema = z.object({
  name: z
    .string()
    .min(1, 'Ingredient name is required')
    .max(100, 'Ingredient name must be 100 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .nullable(),
  supplierName: z
    .string()
    .min(1, 'Supplier name is required')
    .max(100, 'Supplier name must be 100 characters or less'),
  supplierCode: z
    .string()
    .max(50, 'Supplier code must be 50 characters or less')
    .optional()
    .nullable(),
  storageType: StorageType.default('dry'),
  shelfLifeDays: z
    .number()
    .min(1, 'Shelf life must be at least 1 day')
    .optional()
    .nullable(),
  allergens: z
    .array(AllergenType)
    .default([]),
  certifications: z
    .array(z.string().max(50, 'Certification must be 50 characters or less'))
    .default([]),
  isActive: z
    .boolean()
    .default(true)
})

export const updateIngredientSchema = createIngredientSchema.partial()

export const ingredientIdSchema = z.object({
  id: z.string().min(1, 'Ingredient ID is required')
})

// Ingredient Lot validation schemas
export const createIngredientLotSchema = z.object({
  supplierLotCode: z
    .string()
    .min(1, 'Supplier lot code is required')
    .max(100, 'Supplier lot code must be 100 characters or less'),
  internalLotCode: z
    .string()
    .max(100, 'Internal lot code must be 100 characters or less')
    .optional()
    .nullable(),
  quantityReceived: z
    .number()
    .min(0.01, 'Quantity received must be greater than 0'),
  quantityRemaining: z
    .number()
    .min(0, 'Quantity remaining cannot be negative'),
  unitOfMeasure: z
    .string()
    .min(1, 'Unit of measure is required')
    .max(20, 'Unit of measure must be 20 characters or less'),
  receivedDate: z
    .string()
    .datetime(),
  expirationDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  bestByDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  manufactureDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  qualityStatus: QualityStatus.default('pending'),
  qualityNotes: z
    .string()
    .max(2000, 'Quality notes must be 2000 characters or less')
    .optional()
    .nullable(),
  storageLocation: z
    .string()
    .max(100, 'Storage location must be 100 characters or less')
    .optional()
    .nullable(),
  storageConditions: z
    .string()
    .max(500, 'Storage conditions must be 500 characters or less')
    .optional()
    .nullable(),
  testResults: z
    .record(z.any())
    .optional()
    .nullable(),
  ingredientId: z
    .number()
    .min(1, 'Ingredient ID is required')
})

export const updateIngredientLotSchema = createIngredientLotSchema.partial().omit({ ingredientId: true })

// Batch Ingredient (traceability junction) validation schemas
export const createBatchIngredientSchema = z.object({
  quantityUsed: z
    .number()
    .min(0.01, 'Quantity used must be greater than 0'),
  addedBy: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .nullable(),
  productionRunId: z
    .number()
    .min(1, 'Production run ID is required'),
  ingredientLotId: z
    .number()
    .min(1, 'Ingredient lot ID is required')
})

// Pallet validation schemas
export const createPalletSchema = z.object({
  palletCode: z
    .string()
    .max(50, 'Pallet code must be 50 characters or less')
    .optional()
    .nullable(),
  quantityPacked: z
    .number()
    .min(0, 'Quantity packed cannot be negative')
    .optional()
    .nullable(),
  packingDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  expirationDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
  location: z
    .string()
    .max(100, 'Location must be 100 characters or less')
    .default('warehouse')
    .optional()
    .nullable(),
  shippingStatus: z
    .string()
    .max(50, 'Shipping status must be 50 characters or less')
    .default('pending')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(1000, 'Notes must be 1000 characters or less')
    .optional()
    .nullable(),
  packedBy: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  productionRunId: z
    .number()
    .min(1, 'Production run ID is required')
})

export const updatePalletSchema = createPalletSchema.partial().omit({ productionRunId: true })

// Audit Log validation schemas
export const createAuditLogSchema = z.object({
  tableName: z
    .string()
    .min(1, 'Table name is required')
    .max(50, 'Table name must be 50 characters or less'),
  recordId: z
    .number()
    .min(1, 'Record ID is required'),
  action: z
    .enum(['INSERT', 'UPDATE', 'DELETE']),
  oldValues: z
    .record(z.any())
    .optional()
    .nullable(),
  newValues: z
    .record(z.any())
    .optional()
    .nullable(),
  changedBy: z
    .string()
    .min(1, 'Changed by is required')
    .max(100, 'Changed by must be 100 characters or less'),
  ipAddress: z
    .string()
    .max(45, 'IP address must be 45 characters or less') // IPv6 max length
    .optional()
    .nullable(),
  userAgent: z
    .string()
    .max(500, 'User agent must be 500 characters or less')
    .optional()
    .nullable(),
  reason: z
    .string()
    .max(500, 'Reason must be 500 characters or less')
    .optional()
    .nullable()
})

// Traceability query validation schemas
export const traceabilityQuerySchema = z.object({
  lotCode: z.string().optional(),
  dailyLot: z.string().optional(),
  ingredientId: z.string().optional(),
  productionRunId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

// Quality control validation schemas
export const qualityCheckSchema = z.object({
  status: QualityStatus,
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional().nullable(),
  checkedBy: z.string().max(100, 'Checker name must be 100 characters or less'),
  testResults: z.record(z.any()).optional().nullable()
})

// Recall management validation schemas
export const recallInitiationSchema = z.object({
  reason: z.string().min(1, 'Recall reason is required').max(1000, 'Reason must be 1000 characters or less'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedLotCodes: z.array(z.string()).min(1, 'At least one lot code is required'),
  affectedBatchNumbers: z.array(z.string()).optional(),
  initiatedBy: z.string().min(1, 'Initiator is required').max(100, 'Initiator must be 100 characters or less'),
  regulatoryNotification: z.boolean().default(false)
})

// Query parameter validation
export const searchQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  supplier: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

// Response type definitions for TypeScript
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>
export type CreateProductionRunInput = z.infer<typeof createProductionRunSchema>
export type UpdateProductionRunInput = z.infer<typeof updateProductionRunSchema>
export type CreateIngredientLotInput = z.infer<typeof createIngredientLotSchema>
export type UpdateIngredientLotInput = z.infer<typeof updateIngredientLotSchema>
export type CreateBatchIngredientInput = z.infer<typeof createBatchIngredientSchema>
export type CreatePalletInput = z.infer<typeof createPalletSchema>
export type UpdatePalletInput = z.infer<typeof updatePalletSchema>
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>
export type TraceabilityQuery = z.infer<typeof traceabilityQuerySchema>
export type QualityCheck = z.infer<typeof qualityCheckSchema>
export type RecallInitiation = z.infer<typeof recallInitiationSchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>
export type Pagination = z.infer<typeof paginationSchema>

// Enum types for TypeScript
export type BatchStatusType = z.infer<typeof BatchStatus>
export type QualityStatusType = z.infer<typeof QualityStatus>
export type AllergenTypeType = z.infer<typeof AllergenType>
export type StorageTypeType = z.infer<typeof StorageType>
export type AuditActionType = z.infer<typeof AuditAction>
export type AuditEntityType = z.infer<typeof AuditEntity>

// API Error response schema
export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.any()).optional()
})

export type ApiError = z.infer<typeof apiErrorSchema>

// Enhanced response schemas with full model data
export const recipeResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  version: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable()
})

export const ingredientResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  supplierName: z.string(),
  supplierCode: z.string().nullable(),
  storageType: StorageType,
  shelfLifeDays: z.number().nullable(),
  allergens: z.array(AllergenType),
  certifications: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const productionRunResponseSchema = z.object({
  id: z.number(),
  dailyLot: z.string(),
  cakeLot: z.string(),
  icingLot: z.string(),
  recipeId: z.number(),
  plannedQuantity: z.number().nullable(),
  actualQuantity: z.number().nullable(),
  startTime: z.date().nullable(),
  endTime: z.date().nullable(),
  primaryOperatorId: z.number().nullable(),
  assistantOperatorId: z.number().nullable(),
  inspectorId: z.number().nullable(),
  equipmentStation: z.string().nullable(),
  qualityStatus: z.string().nullable(),
  temperature: z.number().nullable(),
  humidity: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date().nullable()
})

export const ingredientLotResponseSchema = z.object({
  id: z.number(),
  ingredientId: z.number(),
  supplierLotCode: z.string(),
  internalLotCode: z.string(),
  receivedDate: z.date(),
  expirationDate: z.date().nullable(),
  manufactureDate: z.date().nullable(),
  quantityReceived: z.number(),
  quantityRemaining: z.number(),
  qualityStatus: QualityStatus,
  testResults: z.record(z.any()).nullable(),
  storageLocation: z.string().nullable(),
  storageConditions: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Complex response schemas with relationships
export const productionRunWithDetailsResponseSchema = productionRunResponseSchema.extend({
  Recipe: recipeResponseSchema,
  BatchIngredient: z.array(z.object({
    id: z.number(),
    productionRunId: z.number(),
    ingredientLotId: z.number(),
    quantityUsed: z.number(),
    addedAt: z.date(),
    addedBy: z.number().nullable(),
    notes: z.string().nullable(),
    createdAt: z.date(),
    IngredientLot: ingredientLotResponseSchema
  })),
  Pallet: z.array(z.object({
    id: z.number(),
    productionRunId: z.number(),
    palletCode: z.string().nullable(),
    quantityPacked: z.number().nullable(),
    packingDate: z.date().nullable(),
    expirationDate: z.date().nullable(),
    shippingStatus: z.string().nullable(),
    location: z.string().nullable(),
    notes: z.string().nullable(),
    packedBy: z.number().nullable(),
    createdAt: z.date(),
    updatedAt: z.date().nullable()
  }))
})

// Traceability response schemas
export const traceabilityResponseSchema = z.object({
  ingredientLots: z.array(ingredientLotResponseSchema),
  productionRuns: z.array(productionRunResponseSchema),
  affectedPallets: z.array(z.object({
    id: z.number(),
    palletNumber: z.string(),
    location: z.string().nullable(),
    status: z.string(),
    productionRunId: z.number()
  })),
  traceabilityChain: z.array(z.object({
    level: z.number(),
    type: z.enum(['ingredient_lot', 'production_run', 'pallet']),
    id: z.number(),
    description: z.string(),
    date: z.date()
  }))
})

export type RecipeResponse = z.infer<typeof recipeResponseSchema>
export type IngredientResponse = z.infer<typeof ingredientResponseSchema>
export type ProductionRunResponse = z.infer<typeof productionRunResponseSchema>
export type IngredientLotResponse = z.infer<typeof ingredientLotResponseSchema>
export type ProductionRunWithDetailsResponse = z.infer<typeof productionRunWithDetailsResponseSchema>
export type TraceabilityResponse = z.infer<typeof traceabilityResponseSchema>
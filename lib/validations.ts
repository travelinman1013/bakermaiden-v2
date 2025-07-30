import { z } from 'zod'

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
    .nullable()
})

export const recipeIdSchema = z.object({
  id: z.string().min(1, 'Recipe ID is required')
})

// Ingredient validation schemas
export const createIngredientSchema = z.object({
  name: z
    .string()
    .min(1, 'Ingredient name is required')
    .max(100, 'Ingredient name must be 100 characters or less')
    .trim(),
  unit: z
    .string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be 20 characters or less')
    .trim(),
  currentStock: z
    .number()
    .min(0, 'Current stock cannot be negative')
    .default(0)
})

export const updateIngredientSchema = z.object({
  name: z
    .string()
    .min(1, 'Ingredient name is required')
    .max(100, 'Ingredient name must be 100 characters or less')
    .trim()
    .optional(),
  unit: z
    .string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be 20 characters or less')
    .trim()
    .optional(),
  currentStock: z
    .number()
    .min(0, 'Current stock cannot be negative')
    .optional()
})

export const ingredientIdSchema = z.object({
  id: z.string().min(1, 'Ingredient ID is required')
})

// Recipe ingredient relationship validation
export const recipeIngredientSchema = z.object({
  ingredientId: z.string().min(1, 'Ingredient ID is required'),
  quantity: z
    .number()
    .positive('Quantity must be greater than 0')
})

export const addRecipeIngredientsSchema = z.object({
  ingredients: z
    .array(recipeIngredientSchema)
    .min(1, 'At least one ingredient is required')
})

// Query parameter validation
export const searchQuerySchema = z.object({
  search: z.string().optional()
})

// Response type definitions for TypeScript
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>

// API Error response schema
export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.any()).optional()
})

export type ApiError = z.infer<typeof apiErrorSchema>

// Success response schemas
export const recipeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const ingredientResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  currentStock: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const recipeWithIngredientsResponseSchema = recipeResponseSchema.extend({
  recipeIngredients: z.array(z.object({
    id: z.string(),
    quantity: z.number(),
    ingredient: ingredientResponseSchema
  }))
})

export type RecipeResponse = z.infer<typeof recipeResponseSchema>
export type IngredientResponse = z.infer<typeof ingredientResponseSchema>
export type RecipeWithIngredientsResponse = z.infer<typeof recipeWithIngredientsResponseSchema>
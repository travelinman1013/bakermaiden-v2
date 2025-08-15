/**
 * Comprehensive TypeScript type definitions for BakerMaiden production tracking system
 * Ensures type safety between database schema, API responses, and frontend components
 */

// Base type definitions matching database schema
export interface Recipe {
  id: number;
  name: string;
  description: string | null;
  version: string;
  isActive: boolean | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface Ingredient {
  id: number;
  name: string;
  supplierName: string;
  supplierCode: string | null;
  storageType: 'dry' | 'refrigerated' | 'frozen';
  shelfLifeDays: number | null;
  allergens: ('milk' | 'eggs' | 'wheat' | 'soy' | 'nuts' | 'peanuts' | 'sesame' | 'fish' | 'shellfish')[];
  certifications: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientLot {
  id: number;
  ingredientId: number;
  supplierLotCode: string;
  internalLotCode: string;
  receivedDate: string;
  expirationDate: string | null;
  manufactureDate: string | null;
  quantityReceived: number;
  quantityRemaining: number;
  qualityStatus: 'pending' | 'passed' | 'failed' | 'quarantined';
  testResults: any | null;
  storageLocation: string | null;
  storageConditions: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BatchIngredient {
  id: number;
  productionRunId: number;
  ingredientLotId: number;
  quantityUsed: number;
  addedAt: string;
  addedBy: number | null;
  notes: string | null;
  createdAt: string;
}

export interface Pallet {
  id: number;
  createdAt: string;
  productionRunId: number;
  palletCode: string | null;
  quantityPacked: number | null;
  packingDate: string | null;
  expirationDate: string | null;
  shippingStatus: string | null;
  location: string | null;
  notes: string | null;
  updatedAt: string | null;
  packedBy: number | null;
}

// Core ProductionRun type from database
export interface ProductionRun {
  id: number;
  createdAt: string;
  dailyLot: string;
  cakeLot: string;
  icingLot: string;
  recipeId: number;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  startTime: string | null;
  endTime: string | null;
  primaryOperatorId: number | null;
  assistantOperatorId: number | null;
  inspectorId: number | null;
  equipmentStation: string | null;
  qualityStatus: string | null;
  temperature: number | null;
  humidity: number | null;
  notes: string | null;
  updatedAt: string | null;
}

// API Response Types (with relationships included)
export interface ProductionRunWithRelations {
  id: number;
  createdAt: string;
  dailyLot: string;
  cakeLot: string;
  icingLot: string;
  recipeId: number;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  startTime: string | null;
  endTime: string | null;
  primaryOperatorId: number | null;
  assistantOperatorId: number | null;
  inspectorId: number | null;
  equipmentStation: string | null;
  qualityStatus: string | null;
  temperature: number | null;
  humidity: number | null;
  notes: string | null;
  updatedAt: string | null;
  
  // Relationships (from Prisma - capitalized)
  Recipe: Recipe;
  Pallet: Pallet[];
  BatchIngredient: (BatchIngredient & {
    IngredientLot: IngredientLot & {
      Ingredient: Ingredient;
    };
  })[];
}

// Frontend Component Expected Types (normalized field names)
export interface ProductionRunDetail {
  id: number;
  batchNumber: string;
  dailyLot: string;
  cakeLot: string;
  icingLot: string;
  plannedQuantity: number;
  actualQuantity: number | null;
  unitOfMeasure: string;
  plannedStartTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  durationMinutes: number | null;
  primaryOperator: string | null;
  assistantOperators: string[];
  productionLine: string | null;
  shift: string | null;
  status: string;
  qualityStatus: string;
  qualityNotes: string | null;
  qualityCheckBy: string | null;
  qualityCheckAt: string | null;
  productionNotes: string | null;
  issuesEncountered: string | null;
  temperature: number | null;
  humidity: number | null;
  createdAt: string;
  updatedAt: string;
  
  // Normalized relationship names (lowercase for frontend)
  recipe: {
    id: number;
    name: string;
    description: string | null;
    version: string;
  };
  
  batchIngredients: Array<{
    id: number;
    quantityUsed: number;
    unitOfMeasure: string;
    percentageOfTotal: number | null;
    addedAt: string | null;
    addedBy: string | null;
    usageNotes: string | null;
    ingredient: {
      id: number;
      name: string;
      type: string;
      allergens: string[];
    };
    ingredientLot: {
      id: number;
      lotCode: string;
      supplierName: string;
      expirationDate: string | null;
      qualityStatus: string;
    };
  }>;
  
  pallets: Array<{
    id: number;
    palletNumber: string;
    weight: number | null;
    itemCount: number | null;
    location: string | null;
    status: string;
    shippedAt: string | null;
    customerOrder: string | null;
  }>;
}

// API Request/Response Types
export interface UpdateProductionRunInput {
  actualQuantity?: number;
  startTime?: string;
  endTime?: string;
  qualityStatus?: string;
  qualityNotes?: string;
  qualityCheckBy?: string;
  qualityCheckAt?: string;
  productionNotes?: string;
  issuesEncountered?: string;
  temperature?: number;
  humidity?: number;
  primaryOperatorId?: number;
  assistantOperatorId?: number;
  inspectorId?: number;
  equipmentStation?: string;
}

// API Error Response Type
export interface ApiErrorResponse {
  error: string;
  code: string;
  details: any;
}

// Success Response Type
export interface ApiSuccessResponse<T = any> {
  data?: T;
  message?: string;
}

// Utility type for API responses
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Type guards for runtime validation
export function isApiErrorResponse(response: any): response is ApiErrorResponse {
  return response && typeof response.error === 'string' && typeof response.code === 'string';
}

export function isProductionRunWithRelations(data: any): data is ProductionRunWithRelations {
  return (
    data &&
    typeof data.id === 'number' &&
    typeof data.dailyLot === 'string' &&
    data.Recipe &&
    typeof data.Recipe.name === 'string' &&
    Array.isArray(data.Pallet) &&
    Array.isArray(data.BatchIngredient)
  );
}

// Data transformation utility types
export type DataTransformFunction<TInput, TOutput> = (input: TInput) => TOutput;

export type ProductionRunTransform = DataTransformFunction<ProductionRunWithRelations, ProductionRunDetail>;
/**
 * Data transformation utilities for BakerMaiden API responses
 * Handles conversion between database schema (Prisma) and frontend expected formats
 */

import { 
  ProductionRunWithRelations, 
  ProductionRunDetail,
  ProductionRunTransform
} from '@/lib/types';

/**
 * Transform Prisma ProductionRun response to frontend-expected format
 * Handles relationship name normalization and field mapping
 */
export const transformProductionRunResponse: ProductionRunTransform = (
  prismaData: ProductionRunWithRelations
): ProductionRunDetail => {
  // Calculate duration if both times are available
  const calculateDuration = (start: string | null, end: string | null): number | null => {
    if (!start || !end) return null;
    const startTime = new Date(start);
    const endTime = new Date(end);
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
  };

  // Generate batch number from daily lot (fallback logic)
  const generateBatchNumber = (dailyLot: string): string => {
    return dailyLot; // For MVP, using dailyLot as batchNumber
  };

  // Extract operator names from user relationships (placeholder for now)
  const extractOperatorName = (operatorId: number | null): string | null => {
    // TODO: In production, join with User table to get actual names
    return operatorId ? `Operator ${operatorId}` : null;
  };

  return {
    // Core fields with direct mapping
    id: prismaData.id,
    batchNumber: generateBatchNumber(prismaData.dailyLot),
    dailyLot: prismaData.dailyLot,
    cakeLot: prismaData.cakeLot,
    icingLot: prismaData.icingLot,
    plannedQuantity: prismaData.plannedQuantity || 0,
    actualQuantity: prismaData.actualQuantity,
    unitOfMeasure: 'units', // Default for MVP
    createdAt: prismaData.createdAt,
    updatedAt: prismaData.updatedAt || prismaData.createdAt,

    // Time fields with proper mapping
    plannedStartTime: prismaData.startTime,
    actualStartTime: prismaData.startTime,
    actualEndTime: prismaData.endTime,
    durationMinutes: calculateDuration(prismaData.startTime, prismaData.endTime),

    // Staff fields with name extraction
    primaryOperator: extractOperatorName(prismaData.primaryOperatorId),
    assistantOperators: prismaData.assistantOperatorId 
      ? [extractOperatorName(prismaData.assistantOperatorId)].filter(Boolean) as string[]
      : [],

    // Equipment and production details
    productionLine: prismaData.equipmentStation,
    shift: null, // Not stored in current schema
    status: 'COMPLETED', // Derive from qualityStatus or other fields
    qualityStatus: prismaData.qualityStatus || 'pending',
    temperature: prismaData.temperature,
    humidity: prismaData.humidity,

    // Notes and quality fields
    qualityNotes: null, // Not in current schema
    qualityCheckBy: extractOperatorName(prismaData.inspectorId),
    qualityCheckAt: null, // Not in current schema
    productionNotes: prismaData.notes,
    issuesEncountered: null, // Could be parsed from notes

    // Transform Recipe relationship (Prisma: Recipe -> frontend: recipe)
    recipe: {
      id: prismaData.Recipe.id,
      name: prismaData.Recipe.name,
      description: prismaData.Recipe.description,
      version: prismaData.Recipe.version || '1.0',
    },

    // Transform BatchIngredient relationships
    batchIngredients: prismaData.BatchIngredient.map(batchIngredient => ({
      id: batchIngredient.id,
      quantityUsed: Number(batchIngredient.quantityUsed),
      unitOfMeasure: 'units', // Default for MVP
      percentageOfTotal: null, // Could be calculated
      addedAt: batchIngredient.addedAt,
      addedBy: extractOperatorName(batchIngredient.addedBy),
      usageNotes: batchIngredient.notes,
      
      ingredient: {
        id: batchIngredient.IngredientLot.Ingredient.id,
        name: batchIngredient.IngredientLot.Ingredient.name,
        type: batchIngredient.IngredientLot.Ingredient.storageType,
        allergens: batchIngredient.IngredientLot.Ingredient.allergens,
      },
      
      ingredientLot: {
        id: batchIngredient.IngredientLot.id,
        lotCode: batchIngredient.IngredientLot.internalLotCode,
        supplierName: batchIngredient.IngredientLot.Ingredient.supplierName,
        expirationDate: batchIngredient.IngredientLot.expirationDate,
        qualityStatus: batchIngredient.IngredientLot.qualityStatus,
      },
    })),

    // Transform Pallet relationships
    pallets: prismaData.Pallet.map(pallet => ({
      id: pallet.id,
      palletNumber: pallet.palletCode || `P${pallet.id}`,
      weight: pallet.quantityPacked,
      itemCount: null, // Not tracked in current schema
      location: pallet.location,
      status: pallet.shippingStatus || 'pending',
      shippedAt: null, // Not in current schema
      customerOrder: null, // Not in current schema
    })),
  };
};

/**
 * Validate that API response has required fields for transformation
 */
export function validateProductionRunResponse(data: any): data is ProductionRunWithRelations {
  const requiredFields = ['id', 'dailyLot', 'Recipe'];
  const hasRequiredFields = requiredFields.every(field => field in data);
  
  const hasValidRecipe = data.Recipe && 
    typeof data.Recipe.id === 'number' && 
    typeof data.Recipe.name === 'string';
  
  const hasValidArrays = Array.isArray(data.Pallet) && Array.isArray(data.BatchIngredient);
  
  return hasRequiredFields && hasValidRecipe && hasValidArrays;
}

/**
 * Safe transformation with error handling
 */
export function safeTransformProductionRun(data: any): ProductionRunDetail | null {
  try {
    if (!validateProductionRunResponse(data)) {
      console.error('Invalid production run response structure:', data);
      return null;
    }
    
    return transformProductionRunResponse(data);
  } catch (error) {
    console.error('Error transforming production run data:', error);
    return null;
  }
}

/**
 * Transform multiple production runs for list views
 */
export function transformProductionRunList(dataArray: any[]): ProductionRunDetail[] {
  return dataArray
    .map(safeTransformProductionRun)
    .filter((item): item is ProductionRunDetail => item !== null);
}

/**
 * Reverse transformation for API updates (frontend -> API format)
 */
export function transformUpdateRequest(updateData: Partial<ProductionRunDetail>): Record<string, any> {
  const apiUpdate: Record<string, any> = {};
  
  // Map frontend field names back to API field names
  if (updateData.actualQuantity !== undefined) {
    apiUpdate.actualQuantity = updateData.actualQuantity;
  }
  
  if (updateData.actualEndTime !== undefined) {
    apiUpdate.endTime = updateData.actualEndTime;
  }
  
  if (updateData.actualStartTime !== undefined) {
    apiUpdate.startTime = updateData.actualStartTime;
  }
  
  if (updateData.qualityStatus !== undefined) {
    apiUpdate.qualityStatus = updateData.qualityStatus;
  }
  
  if (updateData.productionNotes !== undefined) {
    apiUpdate.notes = updateData.productionNotes;
  }
  
  if (updateData.temperature !== undefined) {
    apiUpdate.temperature = updateData.temperature;
  }
  
  if (updateData.humidity !== undefined) {
    apiUpdate.humidity = updateData.humidity;
  }
  
  if (updateData.productionLine !== undefined) {
    apiUpdate.equipmentStation = updateData.productionLine;
  }
  
  return apiUpdate;
}
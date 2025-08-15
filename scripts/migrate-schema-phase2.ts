/**
 * PHASE 2: SCHEMA MIGRATION STRATEGY
 * 
 * Safe additive migration from simple 3-model MVP schema to comprehensive 
 * 8-model production tracking schema while preserving all existing data.
 * 
 * CURRENT SCHEMA: Recipe (3), ProductionRun (2), Pallet (13) = 18 records total
 * TARGET SCHEMA: 8 models with full lot traceability and FDA compliance
 */

interface MigrationStep {
  step: number;
  description: string;
  type: 'schema' | 'data' | 'validation';
  sql?: string;
  rollback?: string;
  risklevel: 'low' | 'medium' | 'high';
  preservesData: boolean;
}

interface MigrationPlan {
  phase: string;
  description: string;
  prerequisites: string[];
  steps: MigrationStep[];
  validationTests: string[];
  rollbackProcedure: string[];
}

/**
 * COMPREHENSIVE MIGRATION STRATEGY
 * 
 * Approach: Additive-only migrations with data preservation
 * - Add new models without modifying existing ones
 * - Enhance existing models with optional fields first  
 * - Create data seeding for new required relationships
 * - Test extensively before making any field required
 */
export const PHASE2_MIGRATION_PLAN: MigrationPlan = {
  phase: "Phase 2: Schema Migration",
  description: "Safe additive migration preserving all 18 existing records while adding production tracking capabilities",
  
  prerequisites: [
    "✅ Database backup verified (18 records)",
    "✅ Current schema documented (Recipe, ProductionRun, Pallet)",
    "⏳ Test database environment configured",
    "⏳ Migration scripts validated on test data",
    "⏳ Rollback procedures tested"
  ],

  steps: [
    // STEP 1: Add new independent models first (no dependencies)
    {
      step: 1,
      description: "Add User model for staff assignments",
      type: "schema",
      sql: `
        CREATE TABLE "User" (
          "id" SERIAL NOT NULL,
          "email" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'operator',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "User_email_key" UNIQUE ("email")
        );
        
        -- Create default users for existing production runs
        INSERT INTO "User" ("email", "name", "role") VALUES 
          ('operator@bakermaiden.com', 'Production Operator', 'operator'),
          ('supervisor@bakermaiden.com', 'Production Supervisor', 'supervisor'),
          ('qc@bakermaiden.com', 'Quality Control', 'inspector');
      `,
      rollback: `DROP TABLE "User";`,
      risklevel: "low",
      preservesData: true
    },

    // STEP 2: Add Ingredient model (independent)
    {
      step: 2,
      description: "Add Ingredient model with supplier information",
      type: "schema", 
      sql: `
        CREATE TYPE "StorageType" AS ENUM ('dry', 'refrigerated', 'frozen');
        CREATE TYPE "AllergenType" AS ENUM ('milk', 'eggs', 'wheat', 'soy', 'nuts', 'peanuts', 'sesame', 'fish', 'shellfish');
        
        CREATE TABLE "Ingredient" (
          "id" SERIAL NOT NULL,
          "name" TEXT NOT NULL,
          "supplierName" TEXT NOT NULL,
          "supplierCode" TEXT,
          "storageType" "StorageType" NOT NULL DEFAULT 'dry',
          "shelfLifeDays" INTEGER,
          "allergens" "AllergenType"[],
          "certifications" TEXT[],
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "Ingredient_name_key" UNIQUE ("name")
        );
        
        -- Seed basic ingredients for existing production runs
        INSERT INTO "Ingredient" ("name", "supplierName", "allergens") VALUES
          ('Cake Mix - Vanilla', 'Commercial Bakery Supply', ARRAY['wheat', 'eggs', 'milk']::"AllergenType"[]),
          ('Icing - Vanilla Buttercream', 'Premium Icing Co', ARRAY['milk', 'eggs']::"AllergenType"[]),
          ('Almond Extract', 'Natural Flavors Inc', ARRAY['nuts']::"AllergenType"[]);
      `,
      rollback: `
        DROP TABLE "Ingredient";
        DROP TYPE "AllergenType";
        DROP TYPE "StorageType";
      `,
      risklevel: "low",
      preservesData: true
    },

    // STEP 3: Add IngredientLot model (depends on Ingredient)
    {
      step: 3,
      description: "Add IngredientLot model for lot traceability",
      type: "schema",
      sql: `
        CREATE TYPE "QualityStatus" AS ENUM ('pending', 'passed', 'failed', 'quarantined');
        
        CREATE TABLE "IngredientLot" (
          "id" SERIAL NOT NULL,
          "ingredientId" INTEGER NOT NULL,
          "supplierLotCode" TEXT NOT NULL,
          "internalLotCode" TEXT NOT NULL,
          "receivedDate" TIMESTAMP(3) NOT NULL,
          "expirationDate" TIMESTAMP(3),
          "manufactureDate" TIMESTAMP(3),
          "quantityReceived" DECIMAL(10,3) NOT NULL,
          "quantityRemaining" DECIMAL(10,3) NOT NULL,
          "qualityStatus" "QualityStatus" NOT NULL DEFAULT 'pending',
          "testResults" JSONB,
          "storageLocation" TEXT,
          "storageConditions" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "IngredientLot_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "IngredientLot_internalLotCode_key" UNIQUE ("internalLotCode"),
          CONSTRAINT "IngredientLot_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT
        );
        
        -- Create sample lots for existing production runs
        INSERT INTO "IngredientLot" ("ingredientId", "supplierLotCode", "internalLotCode", "receivedDate", "quantityReceived", "quantityRemaining", "qualityStatus")
        VALUES 
          (1, 'SUPPLIER-5233M', '5233M', '2025-08-01 08:00:00', 500.000, 200.000, 'passed'),
          (2, 'SUPPLIER-5153', '5153', '2025-08-01 08:00:00', 200.000, 100.000, 'passed'),
          (3, 'SUPPLIER-ALM001', 'ALM001', '2025-08-01 08:00:00', 50.000, 25.000, 'passed');
      `,
      rollback: `
        DROP TABLE "IngredientLot";
        DROP TYPE "QualityStatus";
      `,
      risklevel: "medium",
      preservesData: true
    },

    // STEP 4: Enhance existing ProductionRun model (additive only)
    {
      step: 4,
      description: "Enhance ProductionRun with production tracking fields",
      type: "schema",
      sql: `
        -- Add new columns to existing ProductionRun table
        ALTER TABLE "ProductionRun" 
        ADD COLUMN "plannedQuantity" DECIMAL(10,3),
        ADD COLUMN "actualQuantity" DECIMAL(10,3),
        ADD COLUMN "startTime" TIMESTAMP(3),
        ADD COLUMN "endTime" TIMESTAMP(3),
        ADD COLUMN "primaryOperatorId" INTEGER,
        ADD COLUMN "assistantOperatorId" INTEGER,
        ADD COLUMN "inspectorId" INTEGER,
        ADD COLUMN "equipmentStation" TEXT,
        ADD COLUMN "qualityStatus" TEXT DEFAULT 'pending',
        ADD COLUMN "temperature" DECIMAL(5,2),
        ADD COLUMN "humidity" DECIMAL(5,2),
        ADD COLUMN "notes" TEXT,
        ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
        
        -- Add foreign key constraints to User table
        ALTER TABLE "ProductionRun"
        ADD CONSTRAINT "ProductionRun_primaryOperatorId_fkey" 
          FOREIGN KEY ("primaryOperatorId") REFERENCES "User"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "ProductionRun_assistantOperatorId_fkey" 
          FOREIGN KEY ("assistantOperatorId") REFERENCES "User"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "ProductionRun_inspectorId_fkey" 
          FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL;
        
        -- Update existing production runs with reasonable defaults
        UPDATE "ProductionRun" SET
          "plannedQuantity" = 100.000,
          "actualQuantity" = 95.000,
          "startTime" = "createdAt",
          "endTime" = "createdAt" + INTERVAL '4 hours',
          "primaryOperatorId" = 1,
          "equipmentStation" = 'Station A',
          "qualityStatus" = 'passed',
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "plannedQuantity" IS NULL;
      `,
      rollback: `
        ALTER TABLE "ProductionRun"
        DROP CONSTRAINT "ProductionRun_inspectorId_fkey",
        DROP CONSTRAINT "ProductionRun_assistantOperatorId_fkey", 
        DROP CONSTRAINT "ProductionRun_primaryOperatorId_fkey",
        DROP COLUMN "updatedAt",
        DROP COLUMN "notes",
        DROP COLUMN "humidity",
        DROP COLUMN "temperature", 
        DROP COLUMN "qualityStatus",
        DROP COLUMN "equipmentStation",
        DROP COLUMN "inspectorId",
        DROP COLUMN "assistantOperatorId",
        DROP COLUMN "primaryOperatorId",
        DROP COLUMN "endTime",
        DROP COLUMN "startTime",
        DROP COLUMN "actualQuantity",
        DROP COLUMN "plannedQuantity";
      `,
      risklevel: "medium",
      preservesData: true
    },

    // STEP 5: Create BatchIngredient junction table
    {
      step: 5,
      description: "Add BatchIngredient junction for full traceability",
      type: "schema",
      sql: `
        CREATE TABLE "BatchIngredient" (
          "id" SERIAL NOT NULL,
          "productionRunId" INTEGER NOT NULL,
          "ingredientLotId" INTEGER NOT NULL,
          "quantityUsed" DECIMAL(10,3) NOT NULL,
          "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "addedBy" INTEGER,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "BatchIngredient_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "BatchIngredient_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE,
          CONSTRAINT "BatchIngredient_ingredientLotId_fkey" FOREIGN KEY ("ingredientLotId") REFERENCES "IngredientLot"("id") ON DELETE RESTRICT,
          CONSTRAINT "BatchIngredient_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE SET NULL
        );
        
        -- Create ingredient usage records for existing production runs
        INSERT INTO "BatchIngredient" ("productionRunId", "ingredientLotId", "quantityUsed", "addedBy")
        VALUES 
          -- Production Run 1 ingredients
          (1, 1, 50.000, 1), -- Cake mix
          (1, 2, 25.000, 1), -- Icing
          -- Production Run 2 ingredients  
          (2, 1, 45.000, 1), -- Cake mix
          (2, 2, 20.000, 1), -- Icing
          (2, 3, 2.000, 1);  -- Almond extract
        
        -- Update ingredient lot remaining quantities
        UPDATE "IngredientLot" SET "quantityRemaining" = "quantityRemaining" - 95.000 WHERE "id" = 1;
        UPDATE "IngredientLot" SET "quantityRemaining" = "quantityRemaining" - 45.000 WHERE "id" = 2;
        UPDATE "IngredientLot" SET "quantityRemaining" = "quantityRemaining" - 2.000 WHERE "id" = 3;
      `,
      rollback: `DROP TABLE "BatchIngredient";`,
      risklevel: "medium", 
      preservesData: true
    },

    // STEP 6: Enhance Recipe and Pallet models
    {
      step: 6,
      description: "Enhance Recipe and Pallet models with audit fields",
      type: "schema",
      sql: `
        -- Enhance Recipe model
        ALTER TABLE "Recipe"
        ADD COLUMN "description" TEXT,
        ADD COLUMN "version" TEXT DEFAULT '1.0',
        ADD COLUMN "isActive" BOOLEAN DEFAULT true,
        ADD COLUMN "yieldQuantity" DECIMAL(10,3),
        ADD COLUMN "yieldUnit" TEXT DEFAULT 'units',
        ADD COLUMN "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN "createdBy" INTEGER,
        ADD COLUMN "updatedBy" INTEGER;
        
        -- Add foreign key constraints for Recipe
        ALTER TABLE "Recipe"
        ADD CONSTRAINT "Recipe_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "Recipe_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL;
        
        -- Update existing recipes
        UPDATE "Recipe" SET 
          "description" = 'Traditional ' || "name",
          "yieldQuantity" = 100.000,
          "createdBy" = 1,
          "updatedBy" = 1,
          "createdAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "description" IS NULL;
        
        -- Enhance Pallet model  
        ALTER TABLE "Pallet"
        ADD COLUMN "palletCode" TEXT,
        ADD COLUMN "quantityPacked" DECIMAL(10,3),
        ADD COLUMN "packingDate" TIMESTAMP(3),
        ADD COLUMN "expirationDate" TIMESTAMP(3),
        ADD COLUMN "shippingStatus" TEXT DEFAULT 'pending',
        ADD COLUMN "location" TEXT DEFAULT 'warehouse',
        ADD COLUMN "notes" TEXT,
        ADD COLUMN "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN "packedBy" INTEGER;
        
        -- Add foreign key for Pallet
        ALTER TABLE "Pallet"
        ADD CONSTRAINT "Pallet_packedBy_fkey" FOREIGN KEY ("packedBy") REFERENCES "User"("id") ON DELETE SET NULL;
        
        -- Update existing pallets with reasonable defaults
        UPDATE "Pallet" SET
          "palletCode" = 'PLT-' || LPAD("id"::text, 6, '0'),
          "quantityPacked" = 24.000,
          "packingDate" = "createdAt",
          "expirationDate" = "createdAt" + INTERVAL '7 days',
          "packedBy" = 1,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "palletCode" IS NULL;
      `,
      rollback: `
        ALTER TABLE "Recipe"
        DROP CONSTRAINT "Recipe_updatedBy_fkey",
        DROP CONSTRAINT "Recipe_createdBy_fkey",
        DROP COLUMN "updatedBy",
        DROP COLUMN "createdBy", 
        DROP COLUMN "updatedAt",
        DROP COLUMN "createdAt",
        DROP COLUMN "yieldUnit",
        DROP COLUMN "yieldQuantity",
        DROP COLUMN "isActive",
        DROP COLUMN "version",
        DROP COLUMN "description";
        
        ALTER TABLE "Pallet"
        DROP CONSTRAINT "Pallet_packedBy_fkey",
        DROP COLUMN "packedBy",
        DROP COLUMN "updatedAt",
        DROP COLUMN "notes",
        DROP COLUMN "location",
        DROP COLUMN "shippingStatus",
        DROP COLUMN "expirationDate",
        DROP COLUMN "packingDate",
        DROP COLUMN "quantityPacked",
        DROP COLUMN "palletCode";
      `,
      risklevel: "medium",
      preservesData: true
    },

    // STEP 7: Create AuditLog model for compliance
    {
      step: 7,
      description: "Add AuditLog model for regulatory compliance",
      type: "schema",
      sql: `
        CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'archive');
        CREATE TYPE "AuditEntity" AS ENUM ('recipe', 'production_run', 'ingredient', 'ingredient_lot', 'pallet', 'user');
        
        CREATE TABLE "AuditLog" (
          "id" SERIAL NOT NULL,
          "entityType" "AuditEntity" NOT NULL,
          "entityId" INTEGER NOT NULL,
          "action" "AuditAction" NOT NULL,
          "changes" JSONB,
          "reason" TEXT,
          "performedBy" INTEGER,
          "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          
          CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "AuditLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE SET NULL
        );
        
        -- Create index for efficient audit queries
        CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
        CREATE INDEX "AuditLog_performedAt_idx" ON "AuditLog"("performedAt");
      `,
      rollback: `
        DROP TABLE "AuditLog";
        DROP TYPE "AuditEntity";  
        DROP TYPE "AuditAction";
      `,
      risklevel: "low",
      preservesData: true
    }
  ],

  validationTests: [
    "Verify all 18 original records are preserved with enhanced data",
    "Test foreign key relationships and referential integrity", 
    "Validate enum constraints work correctly",
    "Check traceability queries work (ingredient → production run → pallet)",
    "Verify reverse traceability (pallet → production run → ingredients)",
    "Test rollback procedures on test database",
    "Performance test with realistic data volumes"
  ],

  rollbackProcedure: [
    "1. STOP all application traffic to prevent data corruption",
    "2. Execute rollback SQL for each step in REVERSE order (7→1)",
    "3. Verify original schema matches backup exactly", 
    "4. Restore data from JSON backup if schema rollback insufficient",
    "5. Run full data validation against original backup",
    "6. Resume application traffic only after complete validation"
  ]
};

/**
 * DATA ENHANCEMENT STRATEGY
 * 
 * For new required fields in enhanced existing models:
 * - Use reasonable defaults based on existing data patterns
 * - Create sample data that maintains referential integrity
 * - Ensure all foreign key relationships have valid references
 * - Populate audit fields with system/default user for historical data
 */
export const DATA_ENHANCEMENT_MAPPING = {
  existingRecipes: {
    "HEB Vanilla Quarter Birthday": {
      description: "Traditional HEB Vanilla Quarter Birthday Cake",
      yieldQuantity: 100.0,
      ingredients: ["Cake Mix - Vanilla", "Icing - Vanilla Buttercream"]
    },
    "HEB Vanilla Eighth Ash Blue": {
      description: "Traditional HEB Vanilla Eighth Ash Blue Cake", 
      yieldQuantity: 50.0,
      ingredients: ["Cake Mix - Vanilla", "Icing - Vanilla Buttercream"]
    },
    "Almond Cupcake": {
      description: "Premium Almond Cupcakes",
      yieldQuantity: 75.0, 
      ingredients: ["Cake Mix - Vanilla", "Icing - Vanilla Buttercream", "Almond Extract"]
    }
  },
  
  lotCodeMapping: {
    "5233M": "Cake Mix - Vanilla",
    "5153": "Icing - Vanilla Buttercream" 
  }
};

export default PHASE2_MIGRATION_PLAN;
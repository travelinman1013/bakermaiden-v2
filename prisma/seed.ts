// File: prisma/seed.ts
// Comprehensive FDA-compliant seed data for BakerMaiden production tracking

import { PrismaClient, StorageType, AllergenType, QualityStatus, AuditEntity, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting comprehensive seed data generation...');

  // Clear existing data in proper order (respecting foreign key constraints)
  console.log('🧹 Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.batchIngredient.deleteMany();
  await prisma.pallet.deleteMany();
  await prisma.productionRun.deleteMany();
  await prisma.ingredientLot.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.user.deleteMany();

  // 1. USERS - Staff members for production tracking
  console.log('👥 Creating staff users...');
  const users = await Promise.all([
    // Primary operators
    prisma.user.create({
      data: {
        email: 'maria.rodriguez@bakermaiden.com',
        name: 'Maria Rodriguez',
        role: 'primary_operator',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'james.chen@bakermaiden.com',
        name: 'James Chen',
        role: 'primary_operator',
        isActive: true
      }
    }),
    // Assistant operators
    prisma.user.create({
      data: {
        email: 'sarah.johnson@bakermaiden.com',
        name: 'Sarah Johnson',
        role: 'assistant_operator',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'david.kim@bakermaiden.com',
        name: 'David Kim',
        role: 'assistant_operator',
        isActive: true
      }
    }),
    // Quality inspectors
    prisma.user.create({
      data: {
        email: 'elena.vasquez@bakermaiden.com',
        name: 'Elena Vasquez',
        role: 'quality_inspector',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'michael.brown@bakermaiden.com',
        name: 'Michael Brown',
        role: 'quality_inspector',
        isActive: true
      }
    }),
    // Management
    prisma.user.create({
      data: {
        email: 'amanda.wilson@bakermaiden.com',
        name: 'Amanda Wilson',
        role: 'production_manager',
        isActive: true
      }
    }),
    prisma.user.create({
      data: {
        email: 'robert.taylor@bakermaiden.com',
        name: 'Robert Taylor',
        role: 'quality_manager',
        isActive: true
      }
    })
  ]);

  // 2. RECIPES - Professional bakery cake recipes
  console.log('🍰 Creating bakery recipes...');
  const recipes = await Promise.all([
    // Birthday cakes
    prisma.recipe.create({
      data: {
        name: 'HEB Vanilla Quarter Birthday Cake',
        description: 'Traditional vanilla birthday cake with buttercream frosting, quarter sheet size for retail',
        version: '2.1',
        isActive: true,
        yieldQuantity: 12,
        yieldUnit: 'cakes',
        createdBy: users[6].id, // Production manager
        updatedBy: users[6].id
      }
    }),
    prisma.recipe.create({
      data: {
        name: 'HEB Vanilla Eighth Birthday Cake - Ash Blue',
        description: 'Vanilla birthday cake with ash blue buttercream frosting, eighth sheet size',
        version: '1.8',
        isActive: true,
        yieldQuantity: 24,
        yieldUnit: 'cakes',
        createdBy: users[6].id,
        updatedBy: users[6].id
      }
    }),
    // Cupcakes
    prisma.recipe.create({
      data: {
        name: 'Almond Vanilla Cupcakes',
        description: 'Premium almond-flavored vanilla cupcakes with cream cheese frosting',
        version: '3.0',
        isActive: true,
        yieldQuantity: 48,
        yieldUnit: 'cupcakes',
        createdBy: users[6].id,
        updatedBy: users[6].id
      }
    }),
    // Specialty cakes
    prisma.recipe.create({
      data: {
        name: 'Chocolate Fudge Layer Cake',
        description: 'Rich chocolate cake with fudge buttercream, premium line item',
        version: '1.5',
        isActive: true,
        yieldQuantity: 8,
        yieldUnit: 'cakes',
        createdBy: users[6].id,
        updatedBy: users[6].id
      }
    }),
    prisma.recipe.create({
      data: {
        name: 'Red Velvet Celebration Cake',
        description: 'Classic red velvet with cream cheese frosting, special occasion cake',
        version: '2.3',
        isActive: true,
        yieldQuantity: 6,
        yieldUnit: 'cakes',
        createdBy: users[6].id,
        updatedBy: users[6].id
      }
    }),
    // Test recipe - inactive
    prisma.recipe.create({
      data: {
        name: 'Lemon Pound Cake - Test Recipe',
        description: 'Test recipe for lemon pound cake development',
        version: '0.5',
        isActive: false, // Inactive for testing
        yieldQuantity: 4,
        yieldUnit: 'loaves',
        createdBy: users[6].id,
        updatedBy: users[6].id
      }
    })
  ]);

  // 3. INGREDIENTS - Complete ingredient catalog with suppliers
  console.log('🥚 Creating ingredient catalog...');
  const ingredients = await Promise.all([
    // Flour varieties
    prisma.ingredient.create({
      data: {
        name: 'All-Purpose Flour - Unbleached',
        supplierName: 'King Arthur Baking Company',
        supplierCode: 'KAF-APF-50',
        storageType: StorageType.dry,
        shelfLifeDays: 365,
        allergens: [AllergenType.wheat],
        certifications: ['Non-GMO', 'Kosher'],
        isActive: true
      }
    }),
    prisma.ingredient.create({
      data: {
        name: 'Cake Flour - Bleached',
        supplierName: 'Bob\'s Red Mill',
        supplierCode: 'BRM-CF-25',
        storageType: StorageType.dry,
        shelfLifeDays: 730,
        allergens: [AllergenType.wheat],
        certifications: ['Organic', 'Non-GMO', 'Kosher'],
        isActive: true
      }
    }),
    // Sugars
    prisma.ingredient.create({
      data: {
        name: 'Granulated Sugar - Pure Cane',
        supplierName: 'Domino Foods Inc',
        supplierCode: 'DOM-GS-50',
        storageType: StorageType.dry,
        shelfLifeDays: 1095, // 3 years
        allergens: [],
        certifications: ['Non-GMO', 'Kosher'],
        isActive: true
      }
    }),
    prisma.ingredient.create({
      data: {
        name: 'Confectioner\'s Sugar - 10X',
        supplierName: 'C&H Sugar Company',
        supplierCode: 'CH-CS-25',
        storageType: StorageType.dry,
        shelfLifeDays: 1095,
        allergens: [],
        certifications: ['Kosher'],
        isActive: true
      }
    }),
    // Dairy products
    prisma.ingredient.create({
      data: {
        name: 'Large Grade A Eggs',
        supplierName: 'Vital Farms',
        supplierCode: 'VF-EGG-LA-18',
        storageType: StorageType.refrigerated,
        shelfLifeDays: 35,
        allergens: [AllergenType.eggs],
        certifications: ['Pasture-Raised', 'Organic', 'Non-GMO'],
        isActive: true
      }
    }),
    prisma.ingredient.create({
      data: {
        name: 'Unsalted Butter - European Style',
        supplierName: 'Land O\'Lakes',
        supplierCode: 'LOL-UB-ES-36',
        storageType: StorageType.refrigerated,
        shelfLifeDays: 120,
        allergens: [AllergenType.milk],
        certifications: ['Grade AA', 'Kosher'],
        isActive: true
      }
    }),
    prisma.ingredient.create({
      data: {
        name: 'Whole Milk - 3.25%',
        supplierName: 'Horizon Organic',
        supplierCode: 'HO-WM-GAL',
        storageType: StorageType.refrigerated,
        shelfLifeDays: 14,
        allergens: [AllergenType.milk],
        certifications: ['Organic', 'Non-GMO', 'rBST-Free'],
        isActive: true
      }
    }),
    // Flavorings and extracts
    prisma.ingredient.create({
      data: {
        name: 'Pure Vanilla Extract',
        supplierName: 'Nielsen-Massey Vanillas',
        supplierCode: 'NM-PVE-32',
        storageType: StorageType.dry,
        shelfLifeDays: 1825, // 5 years
        allergens: [],
        certifications: ['Pure Extract', 'Kosher', 'Gluten-Free'],
        isActive: true
      }
    }),
    prisma.ingredient.create({
      data: {
        name: 'Natural Almond Extract',
        supplierName: 'Simply Organic',
        supplierCode: 'SO-NAE-4',
        storageType: StorageType.dry,
        shelfLifeDays: 1460, // 4 years
        allergens: [AllergenType.nuts],
        certifications: ['Organic', 'Kosher', 'Non-GMO'],
        isActive: true
      }
    }),
    // Leavening agents
    prisma.ingredient.create({
      data: {
        name: 'Baking Powder - Double Acting',
        supplierName: 'Clabber Girl',
        supplierCode: 'CG-BP-DA-10',
        storageType: StorageType.dry,
        shelfLifeDays: 365,
        allergens: [],
        certifications: ['Kosher', 'Gluten-Free'],
        isActive: true
      }
    }),
    // Chocolate products
    prisma.ingredient.create({
      data: {
        name: 'Dutch-Process Cocoa Powder',
        supplierName: 'Valrhona',
        supplierCode: 'VAL-DPC-3',
        storageType: StorageType.dry,
        shelfLifeDays: 1095,
        allergens: [],
        certifications: ['Premium Grade', 'Kosher'],
        isActive: true
      }
    }),
    // Food coloring
    prisma.ingredient.create({
      data: {
        name: 'Gel Food Coloring - Ash Blue',
        supplierName: 'Americolor Corporation',
        supplierCode: 'AC-GFC-AB-0.75',
        storageType: StorageType.dry,
        shelfLifeDays: 1460,
        allergens: [],
        certifications: ['FDA Approved', 'Kosher'],
        isActive: true
      }
    }),
    // Testing ingredient - will be marked for recall
    prisma.ingredient.create({
      data: {
        name: 'Cream Cheese - Philadelphia Style',
        supplierName: 'Kraft Heinz Company',
        supplierCode: 'KHC-CC-PS-8',
        storageType: StorageType.refrigerated,
        shelfLifeDays: 30,
        allergens: [AllergenType.milk],
        certifications: ['Kosher'],
        isActive: true
      }
    })
  ]);

  // 4. INGREDIENT LOTS - Individual lots with quality control data
  console.log('📦 Creating ingredient lots with quality control...');
  
  // Generate realistic dates
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
  const threeMonthsFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const ingredientLots = await Promise.all([
    // All-Purpose Flour lots
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[0].id,
        supplierLotCode: 'KAF240815A',
        internalLotCode: 'FL-001-240815',
        receivedDate: thirtyDaysAgo,
        expirationDate: oneYearFromNow,
        manufactureDate: new Date(thirtyDaysAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
        quantityReceived: 50.000,
        quantityRemaining: 38.500,
        qualityStatus: QualityStatus.passed,
        testResults: {
          protein_content: 11.2,
          moisture_content: 13.1,
          ash_content: 0.48,
          falling_number: 385,
          test_date: thirtyDaysAgo.toISOString(),
          tested_by: 'Quality Lab Inc',
          certificate_number: 'QC-FL-240815-001'
        },
        storageLocation: 'Dry Storage - Aisle A, Shelf 3',
        storageConditions: 'Temperature: 68°F, Humidity: 45%, Pest-free'
      }
    }),
    // Cake Flour - active lot
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[1].id,
        supplierLotCode: 'BRM240720B',
        internalLotCode: 'CF-002-240720',
        receivedDate: sixtyDaysAgo,
        expirationDate: new Date(sixtyDaysAgo.getTime() + 730 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(sixtyDaysAgo.getTime() - 10 * 24 * 60 * 60 * 1000),
        quantityReceived: 25.000,
        quantityRemaining: 22.750,
        qualityStatus: QualityStatus.passed,
        testResults: {
          protein_content: 8.8,
          moisture_content: 12.8,
          chlorination_level: 'standard',
          test_date: sixtyDaysAgo.toISOString(),
          certificate_number: 'QC-CF-240720-002'
        },
        storageLocation: 'Dry Storage - Aisle A, Shelf 2',
        storageConditions: 'Temperature: 68°F, Humidity: 45%'
      }
    }),
    // Sugar lots
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[2].id,
        supplierLotCode: 'DOM240801C',
        internalLotCode: 'SG-003-240801',
        receivedDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 1095 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        quantityReceived: 50.000,
        quantityRemaining: 42.300,
        qualityStatus: QualityStatus.passed,
        testResults: {
          purity: 99.87,
          moisture_content: 0.04,
          polarization: 99.95,
          test_date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          certificate_number: 'QC-SG-240801-003'
        },
        storageLocation: 'Dry Storage - Aisle B, Shelf 1',
        storageConditions: 'Temperature: 70°F, Humidity: 40%'
      }
    }),
    // Eggs - multiple lots for traceability testing
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[4].id,
        supplierLotCode: 'VF240810D',
        internalLotCode: 'EG-004-240810',
        receivedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        quantityReceived: 360, // 20 cases of 18
        quantityRemaining: 288,
        qualityStatus: QualityStatus.passed,
        testResults: {
          salmonella_test: 'negative',
          grade: 'AA',
          candling_results: 'passed',
          test_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          certificate_number: 'QC-EG-240810-004'
        },
        storageLocation: 'Refrigerated Storage - Section 1',
        storageConditions: 'Temperature: 38°F, Humidity: 85%'
      }
    }),
    // Older egg lot for testing
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[4].id,
        supplierLotCode: 'VF240725E',
        internalLotCode: 'EG-005-240725',
        receivedDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(now.getTime() - 23 * 24 * 60 * 60 * 1000),
        quantityReceived: 180,
        quantityRemaining: 45,
        qualityStatus: QualityStatus.passed,
        testResults: {
          salmonella_test: 'negative',
          grade: 'AA',
          test_date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          certificate_number: 'QC-EG-240725-005'
        },
        storageLocation: 'Refrigerated Storage - Section 2',
        storageConditions: 'Temperature: 38°F, Humidity: 85%'
      }
    }),
    // Butter lot
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[5].id,
        supplierLotCode: 'LOL240805F',
        internalLotCode: 'BT-006-240805',
        receivedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 110 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
        quantityReceived: 36.000, // 36 lbs
        quantityRemaining: 28.750,
        qualityStatus: QualityStatus.passed,
        testResults: {
          grade: 'AA',
          fat_content: 80.2,
          moisture_content: 15.8,
          salt_content: 0.1,
          test_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          certificate_number: 'QC-BT-240805-006'
        },
        storageLocation: 'Refrigerated Storage - Section 3',
        storageConditions: 'Temperature: 36°F, Humidity: 80%'
      }
    }),
    // Vanilla extract
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[7].id,
        supplierLotCode: 'NM240601G',
        internalLotCode: 'VE-007-240601',
        receivedDate: ninetyDaysAgo,
        expirationDate: new Date(ninetyDaysAgo.getTime() + 1825 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(ninetyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
        quantityReceived: 2.000, // 32 fl oz
        quantityRemaining: 1.650,
        qualityStatus: QualityStatus.passed,
        testResults: {
          alcohol_content: 35.2,
          vanilla_strength: 'single fold',
          clarity: 'clear amber',
          test_date: ninetyDaysAgo.toISOString(),
          certificate_number: 'QC-VE-240601-007'
        },
        storageLocation: 'Dry Storage - Aisle C, Shelf 4',
        storageConditions: 'Temperature: 70°F, Away from light'
      }
    }),
    // Cream cheese lot - this will be used for recall testing
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[12].id,
        supplierLotCode: 'KHC240712H',
        internalLotCode: 'CC-008-240712',
        receivedDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // EXPIRED!
        manufactureDate: new Date(now.getTime() - 38 * 24 * 60 * 60 * 1000),
        quantityReceived: 40.000, // 40 lbs
        quantityRemaining: 12.500,
        qualityStatus: QualityStatus.failed, // FAILED QUALITY - recall scenario
        testResults: {
          listeria_test: 'POSITIVE', // CONTAMINATION FOUND
          salmonella_test: 'negative',
          fat_content: 32.8,
          test_date: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          certificate_number: 'QC-CC-240712-008',
          recall_initiated: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          recall_reason: 'Listeria contamination detected in routine testing'
        },
        storageLocation: 'QUARANTINE - Do Not Use',
        storageConditions: 'Isolated pending disposal'
      }
    }),
    // Ash blue food coloring
    prisma.ingredientLot.create({
      data: {
        ingredientId: ingredients[11].id,
        supplierLotCode: 'AC240718I',
        internalLotCode: 'FC-009-240718',
        receivedDate: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 1432 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        quantityReceived: 0.750, // 0.75 oz
        quantityRemaining: 0.500,
        qualityStatus: QualityStatus.passed,
        testResults: {
          color_consistency: 'uniform',
          fd_c_blue_1: 'within spec',
          heavy_metals: 'within FDA limits',
          test_date: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          certificate_number: 'QC-FC-240718-009'
        },
        storageLocation: 'Dry Storage - Aisle D, Shelf 1',
        storageConditions: 'Temperature: 68°F, Protected from light'
      }
    })
  ]);

  // 5. PRODUCTION RUNS - Complete batch tracking with staff assignments
  console.log('🏭 Creating production runs with lot traceability...');
  const productionRuns = await Promise.all([
    // Recent successful production run - HEB Vanilla Quarter
    prisma.productionRun.create({
      data: {
        dailyLot: '20240815-001',
        cakeLot: 'CAKE-240815-VQ-001',
        icingLot: 'ICING-240815-VQ-001',
        recipeId: recipes[0].id, // HEB Vanilla Quarter
        plannedQuantity: 12.000,
        actualQuantity: 12.000,
        startTime: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
        endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000),   // 2 hours ago
        primaryOperatorId: users[0].id, // Maria Rodriguez
        assistantOperatorId: users[2].id, // Sarah Johnson
        inspectorId: users[4].id, // Elena Vasquez
        equipmentStation: 'Station A - Hobart Mixer',
        qualityStatus: 'passed',
        temperature: 72.5,
        humidity: 55.2,
        notes: 'Perfect batch - all quality parameters met. Excellent texture and color.'
      }
    }),
    // Earlier production run - Almond Cupcakes (using multiple ingredient lots)
    prisma.productionRun.create({
      data: {
        dailyLot: '20240814-002',
        cakeLot: 'CAKE-240814-AC-002',
        icingLot: 'ICING-240814-AC-002',
        recipeId: recipes[2].id, // Almond Cupcakes
        plannedQuantity: 48.000,
        actualQuantity: 46.000, // Slight yield variance
        startTime: new Date(now.getTime() - 30 * 60 * 60 * 1000), // 30 hours ago
        endTime: new Date(now.getTime() - 26 * 60 * 60 * 1000),   // 26 hours ago
        primaryOperatorId: users[1].id, // James Chen
        assistantOperatorId: users[3].id, // David Kim
        inspectorId: users[5].id, // Michael Brown
        equipmentStation: 'Station B - KitchenAid Commercial',
        qualityStatus: 'passed',
        temperature: 71.8,
        humidity: 58.1,
        notes: 'Minor yield variance due to slightly over-mixed batter. Quality approved.'
      }
    }),
    // Production run with contaminated ingredient - RECALL SCENARIO
    prisma.productionRun.create({
      data: {
        dailyLot: '20240810-003',
        cakeLot: 'CAKE-240810-RV-003',
        icingLot: 'ICING-240810-RV-003',
        recipeId: recipes[4].id, // Red Velvet
        plannedQuantity: 6.000,
        actualQuantity: 6.000,
        startTime: new Date(now.getTime() - 120 * 60 * 60 * 1000), // 5 days ago
        endTime: new Date(now.getTime() - 116 * 60 * 60 * 1000),   // 5 days ago
        primaryOperatorId: users[0].id, // Maria Rodriguez
        assistantOperatorId: users[2].id, // Sarah Johnson
        inspectorId: users[4].id, // Elena Vasquez
        equipmentStation: 'Station C - Industrial Mixer',
        qualityStatus: 'failed', // FAILED - contaminated ingredient used
        temperature: 73.2,
        humidity: 52.8,
        notes: 'RECALL INITIATED: Used contaminated cream cheese lot CC-008-240712. All products quarantined.'
      }
    }),
    // In-progress production run
    prisma.productionRun.create({
      data: {
        dailyLot: '20240815-004',
        cakeLot: 'CAKE-240815-CF-004',
        icingLot: 'ICING-240815-CF-004',
        recipeId: recipes[3].id, // Chocolate Fudge
        plannedQuantity: 8.000,
        actualQuantity: null, // Still in progress
        startTime: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        endTime: null, // Still running
        primaryOperatorId: users[1].id, // James Chen
        assistantOperatorId: users[3].id, // David Kim
        inspectorId: null, // Not yet inspected
        equipmentStation: 'Station A - Hobart Mixer',
        qualityStatus: 'pending',
        temperature: 72.1,
        humidity: 56.8,
        notes: 'Production in progress. Mixing phase completed, baking in progress.'
      }
    })
  ]);

  // 6. BATCH INGREDIENTS - Junction table for complete traceability
  console.log('🔗 Creating batch ingredient traceability...');
  await Promise.all([
    // Production Run 1 - HEB Vanilla Quarter ingredients
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[0].id,
        ingredientLotId: ingredientLots[0].id, // All-purpose flour
        quantityUsed: 8.500,
        addedAt: new Date(now.getTime() - 5.5 * 60 * 60 * 1000),
        addedBy: users[0].id, // Maria Rodriguez
        notes: 'Primary flour component - sifted before use'
      }
    }),
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[0].id,
        ingredientLotId: ingredientLots[2].id, // Sugar
        quantityUsed: 6.200,
        addedAt: new Date(now.getTime() - 5.3 * 60 * 60 * 1000),
        addedBy: users[0].id,
        notes: 'Granulated sugar for cake base'
      }
    }),
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[0].id,
        ingredientLotId: ingredientLots[3].id, // Eggs (newer lot)
        quantityUsed: 36,
        addedAt: new Date(now.getTime() - 5.0 * 60 * 60 * 1000),
        addedBy: users[2].id, // Sarah Johnson (assistant)
        notes: '3 dozen eggs - room temperature before use'
      }
    }),
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[0].id,
        ingredientLotId: ingredientLots[5].id, // Butter
        quantityUsed: 4.500,
        addedBy: users[0].id,
        addedAt: new Date(now.getTime() - 4.8 * 60 * 60 * 1000),
        notes: 'Unsalted butter - creamed with sugar'
      }
    }),
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[0].id,
        ingredientLotId: ingredientLots[6].id, // Vanilla extract
        quantityUsed: 0.125,
        addedAt: new Date(now.getTime() - 4.5 * 60 * 60 * 1000),
        addedBy: users[0].id,
        notes: 'Pure vanilla extract - added to wet ingredients'
      }
    }),

    // Production Run 2 - Almond Cupcakes (using older egg lot too)
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[1].id,
        ingredientLotId: ingredientLots[1].id, // Cake flour
        quantityUsed: 12.000,
        addedAt: new Date(now.getTime() - 29.5 * 60 * 60 * 1000),
        addedBy: users[1].id, // James Chen
        notes: 'Cake flour for tender crumb'
      }
    }),
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[1].id,
        ingredientLotId: ingredientLots[4].id, // Eggs (older lot)
        quantityUsed: 72, // Used both lots
        addedAt: new Date(now.getTime() - 29.2 * 60 * 60 * 1000),
        addedBy: users[3].id, // David Kim
        notes: 'Used remaining eggs from lot EG-005-240725'
      }
    }),
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[1].id,
        ingredientLotId: ingredientLots[3].id, // Eggs (newer lot) 
        quantityUsed: 24,
        addedAt: new Date(now.getTime() - 29.0 * 60 * 60 * 1000),
        addedBy: users[3].id,
        notes: 'Additional eggs from fresh lot EG-004-240810'
      }
    }),

    // Production Run 3 - RECALL SCENARIO with contaminated cream cheese
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[2].id,
        ingredientLotId: ingredientLots[0].id, // Flour
        quantityUsed: 5.200,
        addedAt: new Date(now.getTime() - 119.5 * 60 * 60 * 1000),
        addedBy: users[0].id,
        notes: 'Red velvet base flour'
      }
    }),
    prisma.batchIngredient.create({
      data: {
        productionRunId: productionRuns[2].id,
        ingredientLotId: ingredientLots[7].id, // CONTAMINATED CREAM CHEESE
        quantityUsed: 8.000,
        addedAt: new Date(now.getTime() - 118.5 * 60 * 60 * 1000),
        addedBy: users[2].id,
        notes: 'CONTAMINATED LOT - Used for cream cheese frosting. RECALL INITIATED.'
      }
    })
  ]);

  // 7. PALLETS - Finished product tracking
  console.log('📦 Creating finished product pallets...');
  const pallets = await Promise.all([
    // Successful production run pallets
    prisma.pallet.create({
      data: {
        productionRunId: productionRuns[0].id, // HEB Vanilla Quarter
        palletCode: 'PAL-240815-VQ-001A',
        quantityPacked: 6.000,
        packingDate: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        shippingStatus: 'shipped',
        location: 'HEB Distribution Center - Austin',
        notes: 'First half of batch - shipped to HEB Austin stores',
        packedBy: users[2].id // Sarah Johnson
      }
    }),
    prisma.pallet.create({
      data: {
        productionRunId: productionRuns[0].id,
        palletCode: 'PAL-240815-VQ-001B',
        quantityPacked: 6.000,
        packingDate: new Date(now.getTime() - 1.3 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        shippingStatus: 'ready',
        location: 'warehouse',
        notes: 'Second half of batch - ready for shipment',
        packedBy: users[2].id
      }
    }),

    // Almond cupcakes
    prisma.pallet.create({
      data: {
        productionRunId: productionRuns[1].id, // Almond Cupcakes
        palletCode: 'PAL-240814-AC-002A',
        quantityPacked: 46.000, // All cupcakes in one pallet
        packingDate: new Date(now.getTime() - 25 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        shippingStatus: 'shipped',
        location: 'Whole Foods Distribution - San Antonio',
        notes: 'Premium cupcakes for Whole Foods stores',
        packedBy: users[3].id // David Kim
      }
    }),

    // RECALLED PRODUCTS - Red velvet with contaminated ingredient
    prisma.pallet.create({
      data: {
        productionRunId: productionRuns[2].id, // Contaminated Red Velvet
        palletCode: 'PAL-240810-RV-003A',
        quantityPacked: 6.000,
        packingDate: new Date(now.getTime() - 115 * 60 * 60 * 1000),
        expirationDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        shippingStatus: 'recalled', // RECALLED STATUS
        location: 'QUARANTINE - Do Not Ship',
        notes: 'RECALL: Contains contaminated cream cheese from lot CC-008-240712. Customer notification completed.',
        packedBy: users[2].id
      }
    })
  ]);

  // 8. AUDIT LOGS - Complete change tracking for compliance
  console.log('📋 Creating audit trail records...');
  await Promise.all([
    // Recipe creation logs
    prisma.auditLog.create({
      data: {
        entityType: AuditEntity.recipe,
        entityId: recipes[0].id,
        action: AuditAction.create,
        changes: {
          name: 'HEB Vanilla Quarter Birthday Cake',
          version: '2.1',
          created_by: 'Amanda Wilson'
        },
        reason: 'New product launch for HEB partnership',
        performedBy: users[6].id,
        ipAddress: '10.0.1.15',
        userAgent: 'BakerMaiden Production System v2.1'
      }
    }),
    
    // Production run quality status changes
    prisma.auditLog.create({
      data: {
        entityType: AuditEntity.production_run,
        entityId: productionRuns[0].id,
        action: AuditAction.update,
        changes: {
          quality_status: { from: 'pending', to: 'passed' },
          inspector: 'Elena Vasquez',
          inspection_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
        },
        reason: 'Quality inspection completed - all parameters passed',
        performedBy: users[4].id, // Elena Vasquez
        ipAddress: '10.0.1.22',
        userAgent: 'BakerMaiden Mobile QC v1.5'
      }
    }),

    // Ingredient lot quality failure - recall scenario
    prisma.auditLog.create({
      data: {
        entityType: AuditEntity.ingredient_lot,
        entityId: ingredientLots[7].id, // Contaminated cream cheese
        action: AuditAction.update,
        changes: {
          quality_status: { from: 'passed', to: 'failed' },
          contamination_detected: 'Listeria monocytogenes',
          recall_initiated: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        reason: 'Routine testing detected Listeria contamination',
        performedBy: users[7].id, // Quality manager
        ipAddress: '10.0.1.18',
        userAgent: 'BakerMaiden Quality Lab System v3.2'
      }
    }),

    // Production run recall
    prisma.auditLog.create({
      data: {
        entityType: AuditEntity.production_run,
        entityId: productionRuns[2].id,
        action: AuditAction.update,
        changes: {
          quality_status: { from: 'passed', to: 'failed' },
          recall_reason: 'Contaminated ingredient used',
          affected_ingredient_lot: 'CC-008-240712'
        },
        reason: 'Ingredient recall affects finished products',
        performedBy: users[7].id, // Quality manager
        ipAddress: '10.0.1.18',
        userAgent: 'BakerMaiden Recall Management v1.0'
      }
    }),

    // Pallet status change - recall
    prisma.auditLog.create({
      data: {
        entityType: AuditEntity.pallet,
        entityId: pallets[3].id, // Recalled pallet
        action: AuditAction.update,
        changes: {
          shipping_status: { from: 'shipped', to: 'recalled' },
          location: { from: 'Customer', to: 'QUARANTINE - Do Not Ship' },
          recall_notification_sent: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        reason: 'Product recall due to ingredient contamination',
        performedBy: users[6].id, // Production manager
        ipAddress: '10.0.1.15',
        userAgent: 'BakerMaiden Recall Management v1.0'
      }
    })
  ]);

  console.log('✅ Comprehensive seed data generation completed!');
  console.log('');
  console.log('📊 DATA SUMMARY:');
  console.log(`👥 Users created: ${users.length} (operators, inspectors, managers)`);
  console.log(`🍰 Recipes created: ${recipes.length} (including test/inactive recipe)`);
  console.log(`🥚 Ingredients created: ${ingredients.length} (complete bakery catalog)`);
  console.log(`📦 Ingredient lots created: ${ingredientLots.length} (with quality control data)`);
  console.log(`🏭 Production runs created: ${productionRuns.length} (including recall scenario)`);
  console.log(`🔗 Batch ingredients created: ${(await prisma.batchIngredient.count())} (complete traceability)`);
  console.log(`📦 Pallets created: ${pallets.length} (including recalled products)`);
  console.log(`📋 Audit logs created: ${(await prisma.auditLog.count())} (compliance trail)`);
  console.log('');
  console.log('🎯 TESTING SCENARIOS AVAILABLE:');
  console.log('✅ Complete lot traceability chains (ingredient → production → pallet)');
  console.log('✅ Recall management (contaminated cream cheese lot CC-008-240712)');
  console.log('✅ Quality control workflows (passed, failed, quarantined statuses)');
  console.log('✅ Multi-lot ingredient usage (eggs used from 2 different lots)');
  console.log('✅ Production staff assignments and role management');
  console.log('✅ In-progress vs completed production tracking');
  console.log('✅ FDA-compliant audit trail with complete change history');
  console.log('✅ Edge cases: expired ingredients, quality failures, recalls');
  console.log('');
  console.log('🔍 MANUAL TESTING FOCUS AREAS:');
  console.log('- Recipe management and filtering');
  console.log('- Production run creation and tracking');
  console.log('- Ingredient lot quality control');
  console.log('- Forward/backward traceability lookup');
  console.log('- Recall impact assessment (find all affected products)');
  console.log('- Dashboard analytics and reporting');
  console.log('- Mobile production floor interface');
  console.log('');
  console.log('🚀 Ready for comprehensive manual testing!');
}

main()
  .catch((e) => {
    console.error('❌ Seed data generation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
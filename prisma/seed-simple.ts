// Simple seed script for testing database connectivity and basic data population
import { PrismaClient, QualityStatus } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🚀 Starting simple seed data generation...');

  try {
    // Test basic connectivity
    console.log('🔍 Testing database connectivity...');
    const testResult = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', testResult);

    // Clear existing data safely
    console.log('🧹 Clearing existing data...');
    await prisma.batchIngredient.deleteMany();
    await prisma.pallet.deleteMany();
    await prisma.productionRun.deleteMany();
    await prisma.ingredientLot.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared');

    // Create basic test data
    console.log('👥 Creating test users...');
    const user = await prisma.user.create({
      data: {
        email: 'test@bakermaiden.com',
        name: 'Test User',
        role: 'production_manager',
        isActive: true
      }
    });
    console.log('✅ User created:', user.name);

    console.log('🍰 Creating test recipes...');
    const recipe = await prisma.recipe.create({
      data: {
        name: 'Test Vanilla Cake',
        description: 'Simple test recipe for validation',
        version: '1.0',
        isActive: true,
        yieldQuantity: 12,
        yieldUnit: 'cakes',
        createdBy: user.id,
        updatedBy: user.id
      }
    });
    console.log('✅ Recipe created:', recipe.name);

    console.log('🥚 Creating test ingredient...');
    const ingredient = await prisma.ingredient.create({
      data: {
        name: 'Test Flour',
        supplierName: 'Test Supplier',
        supplierCode: 'TEST-001',
        storageType: 'dry',
        shelfLifeDays: 365,
        allergens: ['wheat'],
        certifications: ['Test'],
        isActive: true
      }
    });
    console.log('✅ Ingredient created:', ingredient.name);

    console.log('📦 Creating test ingredient lot...');
    const ingredientLot = await prisma.ingredientLot.create({
      data: {
        ingredientId: ingredient.id,
        supplierLotCode: 'TEST-LOT-001',
        internalLotCode: 'INT-TEST-001',
        receivedDate: new Date(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        manufactureDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        quantityReceived: 50.0,
        quantityRemaining: 45.0,
        qualityStatus: QualityStatus.passed,
        testResults: {
          test_date: new Date().toISOString(),
          certificate_number: 'TEST-CERT-001'
        },
        storageLocation: 'Test Storage',
        storageConditions: 'Test Conditions'
      }
    });
    console.log('✅ Ingredient lot created:', ingredientLot.internalLotCode);

    console.log('🏭 Creating test production run...');
    const productionRun = await prisma.productionRun.create({
      data: {
        dailyLot: 'TEST-DAILY-001',
        cakeLot: 'TEST-CAKE-001',
        icingLot: 'TEST-ICING-001',
        recipeId: recipe.id,
        plannedQuantity: 12.0,
        actualQuantity: 12.0,
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        primaryOperatorId: user.id,
        equipmentStation: 'Test Station',
        qualityStatus: 'passed',
        temperature: 72.0,
        humidity: 55.0,
        notes: 'Test production run - all systems operational'
      }
    });
    console.log('✅ Production run created:', productionRun.dailyLot);

    console.log('🔗 Creating batch ingredient link...');
    const batchIngredient = await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun.id,
        ingredientLotId: ingredientLot.id,
        quantityUsed: 5.0,
        addedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        addedBy: user.id,
        notes: 'Test ingredient usage for traceability verification'
      }
    });
    console.log('✅ Batch ingredient created');

    console.log('📦 Creating test pallet...');
    const pallet = await prisma.pallet.create({
      data: {
        productionRunId: productionRun.id,
        palletCode: 'TEST-PAL-001',
        quantityPacked: 12.0,
        packingDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
        expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        shippingStatus: 'ready',
        location: 'Test Warehouse',
        notes: 'Test pallet for validation',
        packedBy: user.id
      }
    });
    console.log('✅ Pallet created:', pallet.palletCode);

    // Verify the data was created
    const counts = await Promise.all([
      prisma.user.count(),
      prisma.recipe.count(),
      prisma.ingredient.count(),
      prisma.ingredientLot.count(),
      prisma.productionRun.count(),
      prisma.batchIngredient.count(),
      prisma.pallet.count()
    ]);

    console.log('');
    console.log('✅ SIMPLE SEED COMPLETED SUCCESSFULLY!');
    console.log('📊 DATA SUMMARY:');
    console.log(`👥 Users: ${counts[0]}`);
    console.log(`🍰 Recipes: ${counts[1]}`);
    console.log(`🥚 Ingredients: ${counts[2]}`);
    console.log(`📦 Ingredient Lots: ${counts[3]}`);
    console.log(`🏭 Production Runs: ${counts[4]}`);
    console.log(`🔗 Batch Ingredients: ${counts[5]}`);
    console.log(`📦 Pallets: ${counts[6]}`);
    console.log('');
    console.log('🎯 READY FOR BASIC TESTING:');
    console.log('- Basic database connectivity verified');
    console.log('- Simple traceability chain created');
    console.log('- All core models populated with test data');
    console.log('- API endpoints can be tested with real data');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Simple seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
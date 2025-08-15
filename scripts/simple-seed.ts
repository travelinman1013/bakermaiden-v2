import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function main() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data
    console.log('🗑️ Clearing existing data...')
    await prisma.auditLog.deleteMany()
    await prisma.batchIngredient.deleteMany() 
    await prisma.pallet.deleteMany()
    await prisma.productionRun.deleteMany()
    await prisma.ingredientLot.deleteMany()
    await prisma.ingredient.deleteMany()
    await prisma.recipe.deleteMany()
    await prisma.user.deleteMany()

    // Create Users
    console.log('👥 Creating users...')
    const sarah = await prisma.user.create({
      data: {
        email: 'sarah.baker@bakermaiden.com',
        name: 'Sarah Baker',
        role: 'head_baker',
      }
    })

    const mike = await prisma.user.create({
      data: {
        email: 'mike.assistant@bakermaiden.com', 
        name: 'Mike Johnson',
        role: 'assistant_baker',
      }
    })

    const lisa = await prisma.user.create({
      data: {
        email: 'lisa.qa@bakermaiden.com',
        name: 'Lisa Chen', 
        role: 'quality_inspector',
      }
    })

    console.log(`✅ Created 3 users`)

    // Create Ingredients
    console.log('🥄 Creating ingredients...')
    const flour = await prisma.ingredient.create({
      data: {
        name: 'All-Purpose Flour',
        supplierName: 'King Arthur Baking',
        supplierCode: 'KA-APF-50', 
        storageType: 'dry',
        shelfLifeDays: 365,
        allergens: ['wheat'],
        certifications: ['organic'],
      }
    })

    const butter = await prisma.ingredient.create({
      data: {
        name: 'Unsalted Butter',
        supplierName: 'Challenge Dairy',
        supplierCode: 'CD-UB-1',
        storageType: 'refrigerated',
        shelfLifeDays: 45,
        allergens: ['milk'],
        certifications: ['kosher'],
      }
    })

    const eggs = await prisma.ingredient.create({
      data: {
        name: 'Large Eggs',
        supplierName: 'Farm Fresh Eggs', 
        supplierCode: 'FFE-LG-12',
        storageType: 'refrigerated',
        shelfLifeDays: 28,
        allergens: ['eggs'],
        certifications: ['cage-free'],
      }
    })

    const sugar = await prisma.ingredient.create({
      data: {
        name: 'Granulated Sugar',
        supplierName: 'C&H Sugar',
        supplierCode: 'CH-GS-25',
        storageType: 'dry', 
        shelfLifeDays: 730,
        allergens: [],
        certifications: ['kosher'],
      }
    })

    const chocolate = await prisma.ingredient.create({
      data: {
        name: 'Semi-Sweet Chocolate Chips',
        supplierName: 'Guittard',
        supplierCode: 'GT-SSCC-25',
        storageType: 'dry',
        shelfLifeDays: 730,
        allergens: ['milk', 'soy'],
        certifications: ['fair-trade'],
      }
    })

    console.log(`✅ Created 5 ingredients`)

    // Create Ingredient Lots  
    console.log('📦 Creating ingredient lots...')
    const now = new Date()
    
    const flourLot = await prisma.ingredientLot.create({
      data: {
        ingredientId: flour.id,
        supplierLotCode: 'KA-APF-240815',
        internalLotCode: 'BM24081501',
        receivedDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        expirationDate: new Date(now.getTime() + 360 * 24 * 60 * 60 * 1000), // 360 days from now
        manufactureDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        quantityReceived: 50.0,
        quantityRemaining: 42.5,
        qualityStatus: 'passed',
        storageLocation: 'DRY-1',
        storageConditions: '68°F, <60% humidity'
      }
    })

    const butterLot = await prisma.ingredientLot.create({
      data: {
        ingredientId: butter.id,
        supplierLotCode: 'CD-UB-240810', 
        internalLotCode: 'BM24081002',
        receivedDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        expirationDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000), // 42 days from now
        manufactureDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago  
        quantityReceived: 20.0,
        quantityRemaining: 18.2,
        qualityStatus: 'passed',
        storageLocation: 'COOLER-1', 
        storageConditions: '35-38°F'
      }
    })

    const eggsLot = await prisma.ingredientLot.create({
      data: {
        ingredientId: eggs.id,
        supplierLotCode: 'FFE-LG-240812',
        internalLotCode: 'BM24081203', 
        receivedDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        expirationDate: new Date(now.getTime() + 26 * 24 * 60 * 60 * 1000), // 26 days from now
        manufactureDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        quantityReceived: 144.0, // 12 dozen
        quantityRemaining: 132.0, // 11 dozen  
        qualityStatus: 'passed',
        storageLocation: 'COOLER-2',
        storageConditions: '35-38°F'
      }
    })

    console.log(`✅ Created 3 ingredient lots`)

    // Create Recipes
    console.log('📝 Creating recipes...')
    const cookieRecipe = await prisma.recipe.create({
      data: {
        name: 'Classic Chocolate Chip Cookies',
        description: 'Our signature soft and chewy chocolate chip cookies',
        version: '2.1',
        yieldQuantity: 48,
        yieldUnit: 'cookies',
        createdBy: sarah.id,
        updatedBy: sarah.id,
      }
    })

    const cakeRecipe = await prisma.recipe.create({
      data: {
        name: 'Vanilla Birthday Cake',
        description: 'Moist vanilla cake perfect for celebrations', 
        version: '3.0',
        yieldQuantity: 1,
        yieldUnit: '9-inch cake',
        createdBy: sarah.id,
        updatedBy: sarah.id,
      }
    })

    console.log(`✅ Created 2 recipes`)

    // Create Production Runs
    console.log('🏭 Creating production runs...')
    const startTime = new Date(now.getTime() - 4 * 60 * 60 * 1000) // 4 hours ago
    const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago

    const productionRun1 = await prisma.productionRun.create({
      data: {
        dailyLot: 'DL20250815-001',
        cakeLot: 'CK240815',
        icingLot: 'IC240815',
        recipeId: cookieRecipe.id,
        plannedQuantity: 96,
        actualQuantity: 94,
        startTime,
        endTime,
        primaryOperatorId: sarah.id,
        assistantOperatorId: mike.id,
        inspectorId: lisa.id,
        equipmentStation: 'Station-1',
        qualityStatus: 'approved',
        temperature: 72.5,
        humidity: 52.0,
        notes: 'Standard production - no issues noted'
      }
    })

    console.log(`✅ Created 1 production run`)

    // Create Batch Ingredients (traceability)
    console.log('🔗 Creating batch ingredients...')
    await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun1.id,
        ingredientLotId: flourLot.id,
        quantityUsed: 5.2,
        addedAt: new Date(startTime.getTime() + 15 * 60 * 1000), // 15 min after start
        addedBy: mike.id,
        notes: 'Sifted before adding'
      }
    })

    await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun1.id,
        ingredientLotId: butterLot.id, 
        quantityUsed: 1.5,
        addedAt: new Date(startTime.getTime() + 20 * 60 * 1000), // 20 min after start
        addedBy: mike.id,
        notes: 'Room temperature'
      }
    })

    await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun1.id,
        ingredientLotId: eggsLot.id,
        quantityUsed: 8.0,
        addedAt: new Date(startTime.getTime() + 25 * 60 * 1000), // 25 min after start  
        addedBy: mike.id,
        notes: null
      }
    })

    console.log(`✅ Created 3 batch ingredient records`)

    // Create Pallet
    console.log('📦 Creating finished pallet...')
    const packingDate = new Date(endTime.getTime() + 30 * 60 * 1000) // 30 min after production
    const expirationDate = new Date(packingDate.getTime() + 14 * 24 * 60 * 60 * 1000) // 2 weeks later

    await prisma.pallet.create({
      data: {
        productionRunId: productionRun1.id,
        palletCode: 'PLT001-01',
        quantityPacked: 94,
        packingDate,
        expirationDate, 
        shippingStatus: 'ready',
        location: 'warehouse',
        packedBy: mike.id,
        notes: 'Standard packing procedures followed'
      }
    })

    console.log(`✅ Created 1 finished pallet`)

    // Update lot quantities
    await prisma.ingredientLot.update({
      where: { id: flourLot.id },
      data: { quantityRemaining: Number(flourLot.quantityRemaining) - 5.2 }
    })

    await prisma.ingredientLot.update({
      where: { id: butterLot.id },
      data: { quantityRemaining: Number(butterLot.quantityRemaining) - 1.5 }
    })

    await prisma.ingredientLot.update({
      where: { id: eggsLot.id },
      data: { quantityRemaining: Number(eggsLot.quantityRemaining) - 8.0 }
    })

    // Create Audit Log
    console.log('📋 Creating audit log...')
    await prisma.auditLog.create({
      data: {
        entityType: 'production_run',
        entityId: productionRun1.id,
        action: 'create', 
        changes: {
          status: 'approved',
          timestamp: now.toISOString(),
          operator: sarah.name
        },
        reason: 'Production run completed successfully',
        performedBy: sarah.id,
        performedAt: endTime,
        ipAddress: '192.168.1.100',
        userAgent: 'BakerMaiden Production App v2.0'
      }
    })

    console.log(`✅ Created audit log entry`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`👥 Users: 3`)
    console.log(`🥄 Ingredients: 5`) 
    console.log(`📦 Ingredient Lots: 3`)
    console.log(`📝 Recipes: 2`)
    console.log(`🏭 Production Runs: 1`)
    console.log(`🔗 Batch Ingredients: 3`) 
    console.log(`📦 Finished Pallets: 1`)
    console.log(`📋 Audit Logs: 1`)
    console.log('\n✨ Your BakerMaiden application is now ready for testing!')

  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1) 
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
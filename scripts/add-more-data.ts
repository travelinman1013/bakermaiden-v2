import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Adding more test data...')

  const now = new Date()
  
  // Get existing users
  const users = await prisma.user.findMany()
  if (users.length === 0) {
    console.log('❌ No users found. Run simple-seed.ts first.')
    return
  }

  // Add more ingredients
  console.log('🥄 Adding more ingredients...')
  const vanillaExtract = await prisma.ingredient.create({
    data: {
      name: 'Pure Vanilla Extract',
      supplierName: 'Nielsen-Massey',
      supplierCode: 'NM-VE-16',
      storageType: 'dry',
      shelfLifeDays: 1095,
      allergens: [],
      certifications: ['pure', 'madagascar'],
    }
  })

  const bakingPowder = await prisma.ingredient.create({
    data: {
      name: 'Baking Powder',
      supplierName: 'Clabber Girl', 
      supplierCode: 'CG-BP-10',
      storageType: 'dry',
      shelfLifeDays: 540,
      allergens: [],
      certifications: ['aluminum-free'],
    }
  })

  const salt = await prisma.ingredient.create({
    data: {
      name: 'Sea Salt',
      supplierName: 'Diamond Crystal',
      supplierCode: 'DC-SS-3',
      storageType: 'dry',
      shelfLifeDays: 1825,
      allergens: [],
      certifications: ['kosher'],
    }
  })

  // Add ingredient lots for new ingredients
  console.log('📦 Adding more ingredient lots...')
  const vanillaLot = await prisma.ingredientLot.create({
    data: {
      ingredientId: vanillaExtract.id,
      supplierLotCode: 'NM-VE-240801',
      internalLotCode: 'BM24080104',
      receivedDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      expirationDate: new Date(now.getTime() + 1080 * 24 * 60 * 60 * 1000), // 3 years
      manufactureDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      quantityReceived: 5.0,
      quantityRemaining: 4.7,
      qualityStatus: 'passed',
      storageLocation: 'DRY-2',
      storageConditions: '68°F, <60% humidity'
    }
  })

  const bakingPowderLot = await prisma.ingredientLot.create({
    data: {
      ingredientId: bakingPowder.id,
      supplierLotCode: 'CG-BP-240805', 
      internalLotCode: 'BM24080505',
      receivedDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      expirationDate: new Date(now.getTime() + 530 * 24 * 60 * 60 * 1000), // 530 days
      manufactureDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      quantityReceived: 10.0,
      quantityRemaining: 9.3,
      qualityStatus: 'passed',
      storageLocation: 'DRY-1',
      storageConditions: '68°F, <60% humidity'
    }
  })

  // Add more recipes
  console.log('📝 Adding more recipes...')
  const brownieRecipe = await prisma.recipe.create({
    data: {
      name: 'Double Chocolate Brownies',
      description: 'Rich fudgy brownies with chocolate chips for extra indulgence',
      version: '1.8',
      yieldQuantity: 24,
      yieldUnit: 'brownies',
      createdBy: users[0].id,
      updatedBy: users[0].id,
    }
  })

  const breadRecipe = await prisma.recipe.create({
    data: {
      name: 'Artisan Sourdough Bread',
      description: 'Traditional sourdough bread with 48-hour fermentation',
      version: '1.5', 
      yieldQuantity: 2,
      yieldUnit: 'loaves',
      createdBy: users[0].id,
      updatedBy: users[0].id,
    }
  })

  // Add more production runs
  console.log('🏭 Adding more production runs...')
  const startTime1 = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Yesterday
  const endTime1 = new Date(startTime1.getTime() + 3 * 60 * 60 * 1000) // 3 hours later

  const productionRun2 = await prisma.productionRun.create({
    data: {
      dailyLot: 'DL20250814-001',
      cakeLot: 'CK240814',
      icingLot: 'IC240814',
      recipeId: brownieRecipe.id,
      plannedQuantity: 48,
      actualQuantity: 46,
      startTime: startTime1,
      endTime: endTime1,
      primaryOperatorId: users[0].id,
      assistantOperatorId: users[1].id,
      inspectorId: users[2].id,
      equipmentStation: 'Station-2',
      qualityStatus: 'approved',
      temperature: 71.0,
      humidity: 48.5,
      notes: 'Excellent batch - brownies came out perfectly fudgy'
    }
  })

  const startTime2 = new Date(now.getTime() - 48 * 60 * 60 * 1000) // 2 days ago
  const endTime2 = new Date(startTime2.getTime() + 6 * 60 * 60 * 1000) // 6 hours later

  const productionRun3 = await prisma.productionRun.create({
    data: {
      dailyLot: 'DL20250813-001',
      cakeLot: 'CK240813',
      icingLot: 'IC240813', 
      recipeId: breadRecipe.id,
      plannedQuantity: 4,
      actualQuantity: 4,
      startTime: startTime2,
      endTime: endTime2,
      primaryOperatorId: users[1].id,
      assistantOperatorId: users[0].id,
      inspectorId: users[2].id,
      equipmentStation: 'Station-3',
      qualityStatus: 'approved',
      temperature: 75.2,
      humidity: 55.0,
      notes: 'Long fermentation process - excellent crust development'
    }
  })

  // Get some existing ingredient lots
  const existingLots = await prisma.ingredientLot.findMany({
    take: 3
  })

  // Add batch ingredients for new production runs
  console.log('🔗 Adding more batch ingredients...')
  if (existingLots.length >= 2) {
    await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun2.id,
        ingredientLotId: existingLots[0].id, // flour
        quantityUsed: 3.8,
        addedAt: new Date(startTime1.getTime() + 10 * 60 * 1000),
        addedBy: users[1].id,
        notes: 'Double sifted for brownies'
      }
    })

    await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun2.id,
        ingredientLotId: existingLots[1].id, // butter 
        quantityUsed: 2.2,
        addedAt: new Date(startTime1.getTime() + 15 * 60 * 1000),
        addedBy: users[1].id,
        notes: 'Melted for brownies'
      }
    })

    await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun3.id,
        ingredientLotId: existingLots[0].id, // flour for bread
        quantityUsed: 8.5,
        addedAt: new Date(startTime2.getTime() + 30 * 60 * 1000),
        addedBy: users[0].id,
        notes: 'High-protein flour for sourdough'
      }
    })

    await prisma.batchIngredient.create({
      data: {
        productionRunId: productionRun2.id,
        ingredientLotId: vanillaLot.id,
        quantityUsed: 0.2,
        addedAt: new Date(startTime1.getTime() + 20 * 60 * 1000),
        addedBy: users[1].id,
        notes: 'Added to brownie batter'
      }
    })
  }

  // Add more pallets
  console.log('📦 Adding more pallets...')
  const packingDate2 = new Date(endTime1.getTime() + 45 * 60 * 1000)
  const expirationDate2 = new Date(packingDate2.getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days

  await prisma.pallet.create({
    data: {
      productionRunId: productionRun2.id,
      palletCode: 'PLT002-01',
      quantityPacked: 46,
      packingDate: packingDate2,
      expirationDate: expirationDate2,
      shippingStatus: 'shipped',
      location: 'shipped',
      packedBy: users[1].id,
      notes: 'Brownies packaged in individual wrapping'
    }
  })

  const packingDate3 = new Date(endTime2.getTime() + 60 * 60 * 1000)
  const expirationDate3 = new Date(packingDate3.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days

  await prisma.pallet.create({
    data: {
      productionRunId: productionRun3.id,
      palletCode: 'PLT003-01', 
      quantityPacked: 4,
      packingDate: packingDate3,
      expirationDate: expirationDate3,
      shippingStatus: 'ready',
      location: 'loading_dock',
      packedBy: users[0].id,
      notes: 'Artisan bread wrapped in parchment'
    }
  })

  // Add more audit logs
  console.log('📋 Adding more audit logs...')
  await prisma.auditLog.create({
    data: {
      entityType: 'production_run',
      entityId: productionRun2.id,
      action: 'create',
      changes: {
        status: 'approved',
        quality_notes: 'Excellent batch quality',
        timestamp: endTime1.toISOString()
      },
      reason: 'Brownie production completed successfully',
      performedBy: users[2].id, // inspector
      performedAt: endTime1,
      ipAddress: '192.168.1.101',
      userAgent: 'BakerMaiden Production App v2.0'
    }
  })

  await prisma.auditLog.create({
    data: {
      entityType: 'pallet',
      entityId: 1, // Reference to first pallet
      action: 'update',
      changes: {
        shipping_status: 'shipped',
        location: 'shipped',
        timestamp: packingDate2.toISOString()
      },
      reason: 'Pallet shipped to customer',
      performedBy: users[1].id,
      performedAt: packingDate2,
      ipAddress: '192.168.1.102', 
      userAgent: 'BakerMaiden Shipping App v2.0'
    }
  })

  // Update ingredient lot quantities
  console.log('📊 Updating ingredient quantities...')
  if (existingLots.length >= 2) {
    await prisma.ingredientLot.update({
      where: { id: existingLots[0].id },
      data: { quantityRemaining: { decrement: 12.3 } } // flour used in both runs
    })

    await prisma.ingredientLot.update({
      where: { id: existingLots[1].id },
      data: { quantityRemaining: { decrement: 2.2 } } // butter used in brownies
    })
  }

  await prisma.ingredientLot.update({
    where: { id: vanillaLot.id },
    data: { quantityRemaining: { decrement: 0.2 } }
  })

  console.log('\n🎉 Additional data added successfully!')
  console.log('\n📊 Total Data Summary:')
  
  const counts = await Promise.all([
    prisma.user.count(),
    prisma.ingredient.count(),
    prisma.ingredientLot.count(), 
    prisma.recipe.count(),
    prisma.productionRun.count(),
    prisma.batchIngredient.count(),
    prisma.pallet.count(),
    prisma.auditLog.count()
  ])

  console.log(`👥 Users: ${counts[0]}`)
  console.log(`🥄 Ingredients: ${counts[1]}`)
  console.log(`📦 Ingredient Lots: ${counts[2]}`)
  console.log(`📝 Recipes: ${counts[3]}`)
  console.log(`🏭 Production Runs: ${counts[4]}`)
  console.log(`🔗 Batch Ingredients: ${counts[5]}`)
  console.log(`📦 Finished Pallets: ${counts[6]}`)
  console.log(`📋 Audit Logs: ${counts[7]}`)
  console.log('\n✨ BakerMaiden now has comprehensive test data!')
}

main()
  .catch((e) => {
    console.error('❌ Error adding data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
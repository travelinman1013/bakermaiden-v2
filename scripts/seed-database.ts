import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing data (in reverse dependency order)
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
  const users: any[] = []
  
  const userSarah = await prisma.user.create({
    data: {
      email: 'sarah.baker@bakermaiden.com',
      name: 'Sarah Baker',
      role: 'head_baker',
    }
  })
  users.push(userSarah)
  
  const userMike = await prisma.user.create({
    data: {
      email: 'mike.assistant@bakermaiden.com',
      name: 'Mike Johnson',
      role: 'assistant_baker',
    }
  })
  users.push(userMike)
  
  const userLisa = await prisma.user.create({
    data: {
      email: 'lisa.qa@bakermaiden.com',
      name: 'Lisa Chen',
      role: 'quality_inspector',
    }
  })
  users.push(userLisa)
  
  const userTom = await prisma.user.create({
    data: {
      email: 'tom.operator@bakermaiden.com',
      name: 'Tom Rodriguez',
      role: 'operator',
    }
  })
  users.push(userTom)
  
  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@bakermaiden.com',
      name: 'Admin User',
      role: 'admin',
    }
  })
  users.push(userAdmin)
  console.log(`✅ Created ${users.length} users`)

  // Create Ingredients
  console.log('🥄 Creating ingredients...')
  const ingredients = []
  
  // Flour
  const flourAP = await prisma.ingredient.create({
    data: {
      name: 'All-Purpose Flour',
      supplierName: 'King Arthur Baking',
      supplierCode: 'KA-APF-50',
      storageType: 'dry',
      shelfLifeDays: 365,
      allergens: ['wheat'],
      certifications: ['organic', 'non-gmo'],
    }
  })
  ingredients.push(flourAP);
  
  const flourBread = await prisma.ingredient.create({
    data: {
      name: 'Bread Flour',
      supplierName: 'King Arthur Baking',
      supplierCode: 'KA-BF-50',
      storageType: 'dry',
      shelfLifeDays: 365,
      allergens: ['wheat'],
      certifications: ['organic'],
    }
  });
  ingredients.push(flourBread);
  
  // Sugars
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
  });
  ingredients.push(sugar);
  
  const brownSugar = await prisma.ingredient.create({
    data: {
      name: 'Brown Sugar',
      supplierName: 'C&H Sugar',
      supplierCode: 'CH-BS-25',
      storageType: 'dry',
      shelfLifeDays: 365,
      allergens: [],
      certifications: ['kosher'],
    }
  });
  ingredients.push(brownSugar);
  
  // Dairy
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
  });
  ingredients.push(butter);
  
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
  });
  ingredients.push(eggs);
  
  const heavyCream = await prisma.ingredient.create({
    data: {
      name: 'Heavy Cream',
      supplierName: 'Organic Valley',
      supplierCode: 'OV-HC-32',
      storageType: 'refrigerated',
      shelfLifeDays: 14,
      allergens: ['milk'],
      certifications: ['organic'],
    }
  });
  ingredients.push(heavyCream);
  
  // Baking essentials
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
  });
  ingredients.push(bakingPowder);
  
  const vanillaExtract = await prisma.ingredient.create({
    data: {
      name: 'Vanilla Extract',
      supplierName: 'Nielsen-Massey',
      supplierCode: 'NM-VE-16',
      storageType: 'dry',
      shelfLifeDays: 1095,
      allergens: [],
      certifications: ['pure', 'madagascar'],
    }
  });
  ingredients.push(vanillaExtract);
  
  const seaSalt = await prisma.ingredient.create({
    data: {
      name: 'Sea Salt',
      supplierName: 'Diamond Crystal',
      supplierCode: 'DC-SS-3',
      storageType: 'dry',
      shelfLifeDays: 1825,
      allergens: [],
      certifications: ['kosher'],
    }
  });
  ingredients.push(seaSalt);
  
  // Chocolate
  const chocolateChips = await prisma.ingredient.create({
    data: {
      name: 'Semi-Sweet Chocolate Chips',
      supplierName: 'Guittard',
      supplierCode: 'GT-SSCC-25',
      storageType: 'dry',
      shelfLifeDays: 730,
      allergens: ['milk', 'soy'],
      certifications: ['fair-trade'],
    }
  });
  ingredients.push(chocolateChips);
  
  const cocoaPowder = await prisma.ingredient.create({
    data: {
      name: 'Cocoa Powder',
      supplierName: 'Valrhona',
      supplierCode: 'VR-CP-3',
      storageType: 'dry',
      shelfLifeDays: 1095,
      allergens: [],
      certifications: ['dutch-process'],
    }
  });
  ingredients.push(cocoaPowder);
  console.log(`✅ Created ${ingredients.length} ingredients`);

  // Create Ingredient Lots
  console.log('📦 Creating ingredient lots...')
  const ingredientLots = []
  
  // Create multiple lots for each ingredient with realistic dates
  for (const ingredient of ingredients) {
    // Create 2-3 lots per ingredient with different dates
    const lotsForIngredient = []
    
    for (let i = 0; i < 2; i++) {
      const receivedDate = new Date()
      receivedDate.setDate(receivedDate.getDate() - (i * 15 + Math.random() * 10))
      
      const expirationDate = new Date(receivedDate)
      expirationDate.setDate(expirationDate.getDate() + (ingredient.shelfLifeDays || 365))
      
      const manufactureDate = new Date(receivedDate)
      manufactureDate.setDate(manufactureDate.getDate() - (Math.random() * 5 + 1))
      
      const quantityReceived = 25 + Math.random() * 75 // 25-100 lbs/units
      
      const lot = await prisma.ingredientLot.create({
        data: {
          ingredientId: ingredient.id,
          supplierLotCode: `${ingredient.supplierCode}-${String(Date.now() + i).slice(-6)}`,
          internalLotCode: `BM${String(Date.now() + i).slice(-8)}`,
          receivedDate,
          expirationDate,
          manufactureDate,
          quantityReceived,
          quantityRemaining: quantityReceived * (0.7 + Math.random() * 0.3), // 70-100% remaining
          qualityStatus: Math.random() > 0.1 ? 'passed' : 'pending',
          storageLocation: `${ingredient.storageType === 'dry' ? 'DRY' : ingredient.storageType === 'refrigerated' ? 'COOLER' : 'FREEZER'}-${Math.floor(Math.random() * 5) + 1}`,
          storageConditions: ingredient.storageType === 'dry' ? '68°F, <60% humidity' : 
                            ingredient.storageType === 'refrigerated' ? '35-38°F' : '0°F',
          testResults: {
            moisture: Math.random() * 15,
            ph: 6 + Math.random() * 2,
            temperature: ingredient.storageType === 'refrigerated' ? 36 + Math.random() * 3 : 68 + Math.random() * 5,
            testDate: receivedDate.toISOString(),
            testBy: 'lab-cert'
          }
        }
      })
      
      lotsForIngredient.push(lot)
    }
    
    ingredientLots.push(...lotsForIngredient)
  }
  console.log(`✅ Created ${ingredientLots.length} ingredient lots`)

  // Create Recipes
  console.log('📝 Creating recipes...')
  const recipes = await Promise.all([
    prisma.recipe.create({
      data: {
        name: 'Classic Chocolate Chip Cookies',
        description: 'Our signature soft and chewy chocolate chip cookies made with premium ingredients',
        version: '2.1',
        yieldQuantity: 48,
        yieldUnit: 'cookies',
        createdBy: users[0].id,
        updatedBy: users[0].id,
      }
    }),
    prisma.recipe.create({
      data: {
        name: 'Artisan Sourdough Bread',
        description: 'Traditional sourdough bread with 48-hour fermentation process',
        version: '1.5',
        yieldQuantity: 2,
        yieldUnit: 'loaves',
        createdBy: users[0].id,
        updatedBy: users[0].id,
      }
    }),
    prisma.recipe.create({
      data: {
        name: 'Vanilla Birthday Cake',
        description: 'Moist vanilla cake perfect for celebrations, pairs with buttercream frosting',
        version: '3.0',
        yieldQuantity: 1,
        yieldUnit: '9-inch cake',
        createdBy: users[0].id,
        updatedBy: users[0].id,
      }
    }),
    prisma.recipe.create({
      data: {
        name: 'Double Chocolate Brownies',
        description: 'Rich fudgy brownies with chocolate chips for extra indulgence',
        version: '1.8',
        yieldQuantity: 24,
        yieldUnit: 'brownies',
        createdBy: users[1].id,
        updatedBy: users[0].id,
      }
    }),
    prisma.recipe.create({
      data: {
        name: 'Buttercream Frosting',
        description: 'Smooth and creamy vanilla buttercream frosting',
        version: '2.0',
        yieldQuantity: 32,
        yieldUnit: 'ounces',
        createdBy: users[0].id,
        updatedBy: users[0].id,
      }
    })
  ])
  console.log(`✅ Created ${recipes.length} recipes`)

  // Create Production Runs
  console.log('🏭 Creating production runs...')
  const productionRuns = []
  
  for (let i = 0; i < 15; i++) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (i * 2 + Math.random() * 3))
    
    const endDate = new Date(startDate)
    endDate.setHours(endDate.getHours() + (2 + Math.random() * 4))
    
    const recipe = recipes[Math.floor(Math.random() * recipes.length)]
    const plannedQty = (Number(recipe.yieldQuantity) || 24) * (1 + Math.floor(Math.random() * 3))
    
    const run = await prisma.productionRun.create({
      data: {
        dailyLot: `DL${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}${String(startDate.getDate()).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
        cakeLot: `CK${String(Date.now() + i).slice(-6)}`,
        icingLot: `IC${String(Date.now() + i).slice(-6)}`,
        recipeId: recipe.id,
        plannedQuantity: plannedQty,
        actualQuantity: plannedQty * (0.95 + Math.random() * 0.1), // 95-105% yield
        startTime: startDate,
        endTime: endDate,
        primaryOperatorId: users[0].id,
        assistantOperatorId: Math.random() > 0.3 ? users[1].id : users[3].id,
        inspectorId: users[2].id,
        equipmentStation: `Station-${Math.floor(Math.random() * 4) + 1}`,
        qualityStatus: Math.random() > 0.05 ? 'approved' : 'pending',
        temperature: 68 + Math.random() * 8, // 68-76°F
        humidity: 45 + Math.random() * 15, // 45-60%
        notes: Math.random() > 0.7 ? 'Standard production - no issues noted' : 
               Math.random() > 0.5 ? 'Minor temperature fluctuation during baking' :
               'Production completed early due to efficient team work'
      }
    })
    
    productionRuns.push(run)
  }
  console.log(`✅ Created ${productionRuns.length} production runs`)

  // Create Batch Ingredients (traceability links)
  console.log('🔗 Creating batch ingredient traceability...')
  let batchIngredientsCount = 0
  
  for (const run of productionRuns) {
    // Each production run uses 3-6 different ingredients
    const usedIngredients = ingredientLots
      .filter(() => Math.random() > 0.4)
      .slice(0, 3 + Math.floor(Math.random() * 4))
    
    for (const lot of usedIngredients) {
      if (Number(lot.quantityRemaining) > 0) {
        const quantityUsed = Math.min(
          Number(lot.quantityRemaining) * (0.1 + Math.random() * 0.3), // Use 10-40% of remaining
          10 + Math.random() * 15 // Or up to 25 units max
        )
        
        await prisma.batchIngredient.create({
          data: {
            productionRunId: run.id,
            ingredientLotId: lot.id,
            quantityUsed,
            addedAt: new Date(run.startTime!.getTime() + Math.random() * 3600000), // Within first hour
            addedBy: run.assistantOperatorId || run.primaryOperatorId,
            notes: Math.random() > 0.8 ? 'Sifted before adding' : 
                   Math.random() > 0.6 ? 'Room temperature' : null
          }
        })
        
        // Update remaining quantity
        await prisma.ingredientLot.update({
          where: { id: lot.id },
          data: { quantityRemaining: Number(lot.quantityRemaining) - quantityUsed }
        })
        
        batchIngredientsCount++
      }
    }
  }
  console.log(`✅ Created ${batchIngredientsCount} batch ingredient records`)

  // Create Pallets (finished products)
  console.log('📦 Creating finished product pallets...')
  const pallets = []
  
  for (const run of productionRuns) {
    if (run.qualityStatus === 'approved' && Math.random() > 0.2) {
      // Create 1-2 pallets per approved production run
      const palletCount = Math.random() > 0.6 ? 2 : 1
      
      for (let p = 0; p < palletCount; p++) {
        const packingDate = new Date(run.endTime!.getTime() + (2 + Math.random() * 4) * 3600000) // 2-6 hours after production
        const expirationDate = new Date(packingDate)
        expirationDate.setDate(expirationDate.getDate() + (7 + Math.random() * 14)) // 1-3 weeks shelf life
        
        const pallet = await prisma.pallet.create({
          data: {
            productionRunId: run.id,
            palletCode: `PLT${run.dailyLot.slice(-6)}${String(p + 1).padStart(2, '0')}`,
            quantityPacked: (Number(run.actualQuantity!) / palletCount) * (0.98 + Math.random() * 0.04), // Slight packing loss
            packingDate,
            expirationDate,
            shippingStatus: Math.random() > 0.3 ? 'shipped' : 
                           Math.random() > 0.5 ? 'ready' : 'pending',
            location: Math.random() > 0.3 ? 'shipped' : 
                     Math.random() > 0.5 ? 'loading_dock' : 'warehouse',
            packedBy: run.assistantOperatorId || users[3].id,
            notes: Math.random() > 0.7 ? 'Standard packing procedures followed' : null
          }
        })
        
        pallets.push(pallet)
      }
    }
  }
  console.log(`✅ Created ${pallets.length} finished product pallets`)

  // Create Audit Logs
  console.log('📋 Creating audit trail...')
  const auditLogs = []
  
  // Create audit logs for various operations
  const entities = [
    ...recipes.map(r => ({ type: 'recipe' as const, id: r.id, user: users[0].id })),
    ...ingredients.map(i => ({ type: 'ingredient' as const, id: i.id, user: users[0].id })),
    ...productionRuns.map(pr => ({ type: 'production_run' as const, id: pr.id, user: pr.primaryOperatorId! })),
    ...ingredientLots.map(il => ({ type: 'ingredient_lot' as const, id: il.id, user: users[0].id })),
    ...pallets.map(p => ({ type: 'pallet' as const, id: p.id, user: p.packedBy! }))
  ]
  
  for (const entity of entities.slice(0, 50)) { // Limit to 50 audit logs
    const auditDate = new Date()
    auditDate.setDate(auditDate.getDate() - Math.random() * 30)
    
    const log = await prisma.auditLog.create({
      data: {
        entityType: entity.type,
        entityId: entity.id,
        action: Math.random() > 0.8 ? 'update' : 'create',
        changes: {
          timestamp: auditDate.toISOString(),
          field_updated: 'status',
          old_value: 'pending',
          new_value: 'approved',
          reason: 'Quality inspection completed'
        },
        reason: 'Standard quality control process',
        performedBy: entity.user,
        performedAt: auditDate,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        userAgent: 'BakerMaiden Production App v2.0'
      }
    })
    
    auditLogs.push(log)
  }
  console.log(`✅ Created ${auditLogs.length} audit log entries`)

  // Summary
  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`👥 Users: ${users.length}`)
  console.log(`🥄 Ingredients: ${ingredients.length}`)
  console.log(`📦 Ingredient Lots: ${ingredientLots.length}`)
  console.log(`📝 Recipes: ${recipes.length}`)
  console.log(`🏭 Production Runs: ${productionRuns.length}`)
  console.log(`🔗 Batch Ingredients: ${batchIngredientsCount}`)
  console.log(`📦 Finished Pallets: ${pallets.length}`)
  console.log(`📋 Audit Logs: ${auditLogs.length}`)
  console.log('\n✨ Your BakerMaiden application is now ready for testing!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
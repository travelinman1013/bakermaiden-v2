import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function backupCurrentData() {
  try {
    console.log('🔄 Starting database backup...')
    
    // Get all current data
    const recipes = await prisma.recipe.findMany()
    const productionRuns = await prisma.productionRun.findMany()
    const pallets = await prisma.pallet.findMany()
    
    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      description: 'Backup before schema migration - simple MVP schema',
      tables: {
        recipes: {
          count: recipes.length,
          data: recipes
        },
        productionRuns: {
          count: productionRuns.length,
          data: productionRuns
        },
        pallets: {
          count: pallets.length,
          data: pallets
        }
      },
      metadata: {
        totalRecords: recipes.length + productionRuns.length + pallets.length,
        backupType: 'logical',
        sourceSchema: 'simple_mvp'
      }
    }
    
    // Write backup to file
    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const backupFile = path.join(backupDir, `database_backup_${timestamp}.json`)
    
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    
    console.log('✅ Backup completed successfully!')
    console.log(`📁 Backup saved to: ${backupFile}`)
    console.log(`📊 Backup summary:`)
    console.log(`   - Recipes: ${recipes.length}`)
    console.log(`   - Production Runs: ${productionRuns.length}`)
    console.log(`   - Pallets: ${pallets.length}`)
    console.log(`   - Total Records: ${backup.metadata.totalRecords}`)
    
    return backup
    
  } catch (error) {
    console.error('❌ Backup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  backupCurrentData()
    .then(() => {
      console.log('🎉 Backup process completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Backup process failed:', error)
      process.exit(1)
    })
}

export { backupCurrentData }
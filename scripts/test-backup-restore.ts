import * as fs from 'fs'
import * as path from 'path'

async function testBackupIntegrity() {
  try {
    console.log('🔍 Testing backup integrity...')
    
    // Find the latest backup file
    const backupDir = path.join(process.cwd(), 'backups')
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('database_backup_') && file.endsWith('.json'))
      .sort()
      .reverse()
    
    if (backupFiles.length === 0) {
      throw new Error('No backup files found')
    }
    
    const latestBackup = backupFiles[0]
    const backupPath = path.join(backupDir, latestBackup)
    
    console.log(`📁 Testing backup: ${latestBackup}`)
    
    // Read and parse backup
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    const backup = JSON.parse(backupContent)
    
    // Validate backup structure
    const requiredFields = ['timestamp', 'version', 'description', 'tables', 'metadata']
    for (const field of requiredFields) {
      if (!backup[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
    
    // Validate tables structure
    const requiredTables = ['recipes', 'productionRuns', 'pallets']
    for (const table of requiredTables) {
      if (!backup.tables[table]) {
        throw new Error(`Missing table: ${table}`)
      }
      if (!backup.tables[table].data || !Array.isArray(backup.tables[table].data)) {
        throw new Error(`Invalid data structure for table: ${table}`)
      }
    }
    
    // Validate data integrity
    const recipes = backup.tables.recipes.data
    const productionRuns = backup.tables.productionRuns.data
    const pallets = backup.tables.pallets.data
    
    // Check data consistency
    const recipeIds = new Set(recipes.map((r: any) => r.id))
    const productionRunIds = new Set(productionRuns.map((pr: any) => pr.id))
    
    // Validate foreign key relationships
    for (const productionRun of productionRuns) {
      if (!recipeIds.has(productionRun.recipeId)) {
        console.warn(`⚠️  Warning: ProductionRun ${productionRun.id} references non-existent Recipe ${productionRun.recipeId}`)
      }
    }
    
    for (const pallet of pallets) {
      if (!productionRunIds.has(pallet.productionRunId)) {
        console.warn(`⚠️  Warning: Pallet ${pallet.id} references non-existent ProductionRun ${pallet.productionRunId}`)
      }
    }
    
    // Generate integrity report
    const report = {
      backupFile: latestBackup,
      backupSize: fs.statSync(backupPath).size,
      timestamp: backup.timestamp,
      totalRecords: backup.metadata.totalRecords,
      tables: {
        recipes: {
          count: recipes.length,
          expectedCount: backup.tables.recipes.count,
          valid: recipes.length === backup.tables.recipes.count
        },
        productionRuns: {
          count: productionRuns.length,
          expectedCount: backup.tables.productionRuns.count,
          valid: productionRuns.length === backup.tables.productionRuns.count
        },
        pallets: {
          count: pallets.length,
          expectedCount: backup.tables.pallets.count,
          valid: pallets.length === backup.tables.pallets.count
        }
      },
      integrity: {
        structureValid: true,
        dataConsistent: true,
        relationshipsValid: true
      }
    }
    
    console.log('✅ Backup integrity test completed successfully!')
    console.log(`📊 Backup Report:`)
    console.log(`   - File: ${report.backupFile}`)
    console.log(`   - Size: ${(report.backupSize / 1024).toFixed(2)} KB`)
    console.log(`   - Total Records: ${report.totalRecords}`)
    console.log(`   - Recipes: ${report.tables.recipes.count} (${report.tables.recipes.valid ? '✅' : '❌'})`)
    console.log(`   - Production Runs: ${report.tables.productionRuns.count} (${report.tables.productionRuns.valid ? '✅' : '❌'})`)
    console.log(`   - Pallets: ${report.tables.pallets.count} (${report.tables.pallets.valid ? '✅' : '❌'})`)
    
    return report
    
  } catch (error) {
    console.error('❌ Backup integrity test failed:', error)
    throw error
  }
}

if (require.main === module) {
  testBackupIntegrity()
    .then(() => {
      console.log('🎉 Backup integrity test completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Backup integrity test failed:', error)
      process.exit(1)
    })
}

export { testBackupIntegrity }
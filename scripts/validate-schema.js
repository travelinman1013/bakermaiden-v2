#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

class SchemaValidator {
  constructor() {
    this.prisma = new PrismaClient();
    this.errors = [];
    this.warnings = [];
    this.testResults = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  async validateDatabaseConnection() {
    this.log('Testing database connection...');
    
    try {
      await this.prisma.$connect();
      this.log('Database connection successful', 'success');
      return true;
    } catch (error) {
      this.addError(`Database connection failed: ${error.message}`);
      return false;
    }
  }

  async validateCoreModels() {
    this.log('Validating core data models...');

    const tests = [
      {
        name: 'Recipe Model',
        test: async () => {
          const count = await this.prisma.recipe.count();
          return { count, success: true };
        }
      },
      {
        name: 'Ingredient Model',
        test: async () => {
          const count = await this.prisma.ingredient.count();
          return { count, success: true };
        }
      },
      {
        name: 'Production Run Model',
        test: async () => {
          const count = await this.prisma.productionRun.count();
          return { count, success: true };
        }
      },
      {
        name: 'Ingredient Lot Model',
        test: async () => {
          const count = await this.prisma.ingredientLot.count();
          return { count, success: true };
        }
      },
      {
        name: 'Batch Ingredient Model',
        test: async () => {
          const count = await this.prisma.batchIngredient.count();
          return { count, success: true };
        }
      },
      {
        name: 'Pallet Model',
        test: async () => {
          const count = await this.prisma.pallet.count();
          return { count, success: true };
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        this.testResults[test.name] = result;
        this.log(`${test.name}: ${result.count} records`, 'success');
      } catch (error) {
        this.testResults[test.name] = { error: error.message, success: false };
        this.addError(`${test.name} validation failed: ${error.message}`);
      }
    }
  }

  async validateRelationships() {
    this.log('Validating model relationships...');

    try {
      // Test Recipe -> Production Run relationship
      const recipeWithRuns = await this.prisma.recipe.findFirst({
        include: {
          productionRuns: true
        }
      });
      
      if (recipeWithRuns) {
        this.log(`Recipe relationships: ${recipeWithRuns.productionRuns.length} production runs`, 'success');
      }

      // Test Production Run -> Batch Ingredients -> Ingredient Lots
      const productionRunWithIngredients = await this.prisma.productionRun.findFirst({
        include: {
          batchIngredients: {
            include: {
              ingredientLot: {
                include: {
                  ingredient: true
                }
              }
            }
          },
          pallets: true
        }
      });

      if (productionRunWithIngredients) {
        this.log(`Production run relationships: ${productionRunWithIngredients.batchIngredients.length} batch ingredients, ${productionRunWithIngredients.pallets.length} pallets`, 'success');
        
        // Test deep relationship
        const traceableIngredients = productionRunWithIngredients.batchIngredients.filter(
          bi => bi.ingredientLot && bi.ingredientLot.ingredient
        );
        this.log(`Traceable ingredients: ${traceableIngredients.length}`, 'success');
      }

      // Test Ingredient Lot -> Batch Ingredients (forward traceability)
      const ingredientLotUsage = await this.prisma.ingredientLot.findFirst({
        include: {
          batchIngredients: {
            include: {
              productionRun: {
                include: {
                  pallets: true
                }
              }
            }
          }
        }
      });

      if (ingredientLotUsage) {
        const usageCount = ingredientLotUsage.batchIngredients.length;
        const affectedPallets = ingredientLotUsage.batchIngredients.reduce((acc, bi) => 
          acc + (bi.productionRun?.pallets.length || 0), 0
        );
        this.log(`Ingredient lot traceability: used in ${usageCount} batches, affects ${affectedPallets} pallets`, 'success');
      }

    } catch (error) {
      this.addError(`Relationship validation failed: ${error.message}`);
    }
  }

  async validateTraceabilityFeatures() {
    this.log('Validating lot traceability features...');

    try {
      // Test backward traceability (from pallet to ingredients)
      const pallet = await this.prisma.pallet.findFirst({
        include: {
          productionRun: {
            include: {
              batchIngredients: {
                include: {
                  ingredientLot: {
                    include: {
                      ingredient: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (pallet) {
        const ingredientCount = pallet.productionRun.batchIngredients.length;
        this.log(`Backward traceability: pallet ${pallet.palletCode} traces to ${ingredientCount} ingredient lots`, 'success');
      } else {
        this.addWarning('No pallets found for traceability testing');
      }

      // Test forward traceability (from ingredient lot to pallets)
      const ingredientLot = await this.prisma.ingredientLot.findFirst({
        include: {
          batchIngredients: {
            include: {
              productionRun: {
                include: {
                  pallets: true
                }
              }
            }
          }
        }
      });

      if (ingredientLot) {
        const affectedPallets = ingredientLot.batchIngredients.reduce((acc, bi) => 
          acc.concat(bi.productionRun.pallets.map(p => p.palletCode)), []
        );
        this.log(`Forward traceability: ingredient lot ${ingredientLot.lotNumber} affects ${affectedPallets.length} pallets`, 'success');
      } else {
        this.addWarning('No ingredient lots found for traceability testing');
      }

    } catch (error) {
      this.addError(`Traceability validation failed: ${error.message}`);
    }
  }

  async validateDataIntegrity() {
    this.log('Validating data integrity constraints...');

    try {
      // Check for orphaned records
      const orphanedBatchIngredients = await this.prisma.batchIngredient.count({
        where: {
          OR: [
            { productionRun: null },
            { ingredientLot: null }
          ]
        }
      });

      if (orphanedBatchIngredients > 0) {
        this.addWarning(`Found ${orphanedBatchIngredients} orphaned batch ingredients`);
      } else {
        this.log('No orphaned batch ingredients found', 'success');
      }

      // Check for pallets without production runs
      const orphanedPallets = await this.prisma.pallet.count({
        where: {
          productionRun: null
        }
      });

      if (orphanedPallets > 0) {
        this.addWarning(`Found ${orphanedPallets} orphaned pallets`);
      } else {
        this.log('No orphaned pallets found', 'success');
      }

      // Check for ingredient lots without ingredients
      const orphanedLots = await this.prisma.ingredientLot.count({
        where: {
          ingredient: null
        }
      });

      if (orphanedLots > 0) {
        this.addWarning(`Found ${orphanedLots} orphaned ingredient lots`);
      } else {
        this.log('No orphaned ingredient lots found', 'success');
      }

    } catch (error) {
      this.addError(`Data integrity validation failed: ${error.message}`);
    }
  }

  async validatePerformance() {
    this.log('Testing query performance...');

    const performanceTests = [
      {
        name: 'Recipe Lookup',
        query: () => this.prisma.recipe.findMany({
          take: 10,
          include: {
            productionRuns: {
              take: 5
            }
          }
        })
      },
      {
        name: 'Production Run Details',
        query: () => this.prisma.productionRun.findMany({
          take: 10,
          include: {
            batchIngredients: {
              include: {
                ingredientLot: {
                  include: {
                    ingredient: true
                  }
                }
              }
            },
            pallets: true
          }
        })
      },
      {
        name: 'Traceability Query',
        query: () => this.prisma.ingredientLot.findMany({
          take: 5,
          include: {
            batchIngredients: {
              include: {
                productionRun: {
                  include: {
                    pallets: true
                  }
                }
              }
            }
          }
        })
      }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        const result = await test.query();
        const duration = Date.now() - startTime;

        this.testResults[`${test.name} Performance`] = {
          duration: `${duration}ms`,
          recordCount: Array.isArray(result) ? result.length : 1
        };

        if (duration > 1000) {
          this.addWarning(`${test.name} query took ${duration}ms (>1000ms threshold)`);
        } else {
          this.log(`${test.name}: ${duration}ms (${Array.isArray(result) ? result.length : 1} records)`, 'success');
        }
      } catch (error) {
        this.addError(`${test.name} performance test failed: ${error.message}`);
      }
    }
  }

  async validateIndexes() {
    this.log('Validating database indexes...');

    try {
      // Query to check for missing indexes on foreign keys
      const queries = [
        `SELECT * FROM information_schema.statistics WHERE table_schema = DATABASE() AND index_name != 'PRIMARY'`,
        // Add database-specific index queries
      ];

      // This is a simplified check - in production, you'd query the database metadata
      this.log('Index validation requires database-specific queries', 'warning');
      this.addWarning('Manual index review recommended for production deployment');

    } catch (error) {
      this.addWarning(`Index validation skipped: ${error.message}`);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      status: this.errors.length === 0 ? 'PASSED' : 'FAILED',
      database: process.env.DATABASE_URL ? 'Connected' : 'Not configured',
      testResults: this.testResults,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        testsCompleted: Object.keys(this.testResults).length
      }
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'schema-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  async run() {
    this.log('Starting schema validation...', 'info');

    try {
      const connected = await this.validateDatabaseConnection();
      if (!connected) {
        this.generateReport();
        process.exit(1);
      }

      await this.validateCoreModels();
      await this.validateRelationships();
      await this.validateTraceabilityFeatures();
      await this.validateDataIntegrity();
      await this.validatePerformance();
      await this.validateIndexes();

      const report = this.generateReport();

      if (this.errors.length === 0) {
        this.log('✨ Schema validation completed successfully!', 'success');
        this.log(`📊 Report saved to: schema-validation-report.json`);
        
        if (this.warnings.length > 0) {
          this.log(`⚠️  ${this.warnings.length} warnings found (see report for details)`);
        }
      } else {
        this.log(`❌ Schema validation failed with ${this.errors.length} errors`, 'error');
        process.exit(1);
      }

    } catch (error) {
      this.addError(`Schema validation process failed: ${error.message}`);
      this.generateReport();
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SchemaValidator();
  validator.run();
}

module.exports = SchemaValidator;
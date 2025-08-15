#!/usr/bin/env tsx

/**
 * Schema-API Consistency Validation Script
 * 
 * Automatically detects field name mismatches between Prisma schema
 * and API endpoint implementations to prevent production errors.
 * 
 * Usage: npm run validate:schema-api
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface SchemaField {
  model: string;
  field: string;
  type: string;
  isRelation: boolean;
  relationModel?: string;
}

interface ApiFieldUsage {
  file: string;
  line: number;
  field: string;
  model: string;
  usage: string;
}

interface ValidationError {
  type: 'FIELD_NOT_EXISTS' | 'WRONG_RELATION' | 'INVALID_ENUM';
  file: string;
  line: number;
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  summary: {
    totalFiles: number;
    totalQueries: number;
    errorCount: number;
    warningCount: number;
  };
}

class SchemaApiValidator {
  private schemaFields: Map<string, SchemaField[]> = new Map();
  private apiUsages: ApiFieldUsage[] = [];
  
  async validateConsistency(): Promise<ValidationResult> {
    console.log('🔍 Starting Schema-API Consistency Validation...\n');
    
    // Step 1: Parse Prisma schema
    console.log('📋 Parsing Prisma schema...');
    await this.parseSchema();
    console.log(`   Found ${Array.from(this.schemaFields.values()).flat().length} fields across ${this.schemaFields.size} models\n`);
    
    // Step 2: Scan API files
    console.log('🔎 Scanning API endpoints...');
    await this.scanApiFiles();
    console.log(`   Found ${this.apiUsages.length} database field usages\n`);
    
    // Step 3: Validate consistency
    console.log('✅ Validating consistency...');
    const errors = this.validateFieldUsages();
    
    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      summary: {
        totalFiles: this.getApiFileCount(),
        totalQueries: this.apiUsages.length,
        errorCount: errors.length,
        warningCount: 0
      }
    };
    
    this.printResults(result);
    return result;
  }
  
  private async parseSchema(): Promise<void> {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Simple parser for model definitions
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let modelMatch;
    
    while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
      const modelName = modelMatch[1];
      const modelContent = modelMatch[2];
      
      const fields: SchemaField[] = [];
      
      // Parse fields within the model
      const fieldLines = modelContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
      
      for (const line of fieldLines) {
        const fieldMatch = line.match(/^\s*(\w+)\s+([\w\[\]?]+)/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const fieldType = fieldMatch[2];
          
          // Skip special Prisma directives
          if (['id', 'default', 'unique', 'index'].includes(fieldName)) continue;
          
          const isRelation = /^[A-Z]/.test(fieldType) && !fieldType.includes('[]');
          
          fields.push({
            model: modelName,
            field: fieldName,
            type: fieldType,
            isRelation,
            relationModel: isRelation ? fieldType.replace(/[\[\]?]/g, '') : undefined
          });
        }
      }
      
      this.schemaFields.set(modelName, fields);
    }
  }
  
  private async scanApiFiles(): Promise<void> {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    const apiFiles = this.getAllApiFiles(apiDir);
    
    for (const filePath of apiFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Look for Prisma queries
        const queryMatches = [
          ...Array.from(line.matchAll(/prisma\.(\w+)\.findMany\({([^}]+)}\)/g)),
          ...Array.from(line.matchAll(/prisma\.(\w+)\.findFirst\({([^}]+)}\)/g)),
          ...Array.from(line.matchAll(/prisma\.(\w+)\.count\({([^}]+)}\)/g)),
          ...Array.from(line.matchAll(/where\.(\w+)\s*[=:]/g)),
          ...Array.from(line.matchAll(/\{\s*(\w+):\s*\{/g))
        ];
        
        for (const match of queryMatches) {
          let model = match[1];
          let field = match[1];
          
          // Convert camelCase to PascalCase for model names
          if (match[0].includes('prisma.')) {
            model = model.charAt(0).toUpperCase() + model.slice(1);
            // Extract field usage from the query
            const queryContent = match[2] || '';
            const fieldMatches = Array.from(queryContent.matchAll(/(\w+):/g));
            for (const fieldMatch of fieldMatches) {
              this.apiUsages.push({
                file: filePath,
                line: index + 1,
                field: fieldMatch[1],
                model,
                usage: line.trim()
              });
            }
          } else {
            this.apiUsages.push({
              file: filePath,
              line: index + 1,
              field,
              model: this.inferModelFromContext(line),
              usage: line.trim()
            });
          }
        }
      });
    }
  }
  
  private getAllApiFiles(dir: string): string[] {
    const files: string[] = [];
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllApiFiles(fullPath));
      } else if (item.endsWith('.ts') || item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  private inferModelFromContext(line: string): string {
    // Try to infer model from context
    const modelPatterns = [
      /prisma\.(\w+)/,
      /(\w+)Lot/,
      /(\w+)Run/,
      /(\w+)Ingredient/
    ];
    
    for (const pattern of modelPatterns) {
      const match = line.match(pattern);
      if (match) {
        let model = match[1];
        return model.charAt(0).toUpperCase() + model.slice(1);
      }
    }
    
    return 'Unknown';
  }
  
  private validateFieldUsages(): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const usage of this.apiUsages) {
      const modelFields = this.schemaFields.get(usage.model);
      
      if (!modelFields) {
        continue; // Skip if we can't find the model
      }
      
      const fieldExists = modelFields.some(f => f.field === usage.field);
      
      if (!fieldExists) {
        // Check for common mismatches
        const suggestions = this.getSuggestions(usage.field, modelFields);
        
        errors.push({
          type: 'FIELD_NOT_EXISTS',
          file: usage.file,
          line: usage.line,
          message: `Field '${usage.field}' does not exist in model '${usage.model}'`,
          suggestion: suggestions.length > 0 ? `Did you mean: ${suggestions.join(', ')}?` : undefined
        });
      }
    }
    
    return errors;
  }
  
  private getSuggestions(field: string, modelFields: SchemaField[]): string[] {
    const suggestions: string[] = [];
    
    // Look for similar field names
    for (const modelField of modelFields) {
      const similarity = this.calculateSimilarity(field, modelField.field);
      if (similarity > 0.6) {
        suggestions.push(modelField.field);
      }
    }
    
    // Common mapping patterns
    const commonMappings: Record<string, string[]> = {
      'lotCode': ['supplierLotCode', 'internalLotCode'],
      'status': ['qualityStatus', 'shippingStatus'],
      'name': ['supplierName'],
      'code': ['supplierCode', 'internalLotCode']
    };
    
    if (commonMappings[field]) {
      suggestions.push(...commonMappings[field]);
    }
    
    return Array.from(new Set(suggestions)).slice(0, 3);
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private getApiFileCount(): number {
    const apiDir = path.join(process.cwd(), 'app', 'api');
    return this.getAllApiFiles(apiDir).length;
  }
  
  private printResults(result: ValidationResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    console.log(`📁 Files scanned: ${result.summary.totalFiles}`);
    console.log(`🔍 Database queries found: ${result.summary.totalQueries}`);
    console.log(`❌ Errors: ${result.summary.errorCount}`);
    console.log(`⚠️  Warnings: ${result.summary.warningCount}`);
    
    if (result.errors.length > 0) {
      console.log('\n🚨 ERRORS FOUND:');
      console.log('-'.repeat(40));
      
      for (const error of result.errors) {
        const relativePath = path.relative(process.cwd(), error.file);
        console.log(`\n📁 ${relativePath}:${error.line}`);
        console.log(`   ❌ ${error.message}`);
        if (error.suggestion) {
          console.log(`   💡 ${error.suggestion}`);
        }
      }
    }
    
    if (result.isValid) {
      console.log('\n✅ All validations passed! Schema and API are consistent.');
    } else {
      console.log('\n❌ Validation failed. Please fix the errors above.');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Main execution
async function main() {
  try {
    const validator = new SchemaApiValidator();
    const result = await validator.validateConsistency();
    
    // Exit with error code if validation fails
    if (!result.isValid) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SchemaApiValidator, type ValidationResult };
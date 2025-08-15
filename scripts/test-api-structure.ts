#!/usr/bin/env tsx
/**
 * Test script to verify API data structure consistency
 * Validates that API responses match frontend component expectations
 */

import { ProductionRunDetail, isApiErrorResponse } from '../lib/types';

interface TestResult {
  endpoint: string;
  success: boolean;
  errors: string[];
  data?: any;
}

async function testApiEndpoint(endpoint: string, method: 'GET' | 'PUT' = 'GET', body?: any): Promise<TestResult> {
  const result: TestResult = {
    endpoint,
    success: false,
    errors: []
  };

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:3001${endpoint}`, options);
    const data = await response.json();

    result.data = data;

    if (!response.ok) {
      // Check if this error was expected
      const testConfig = endpoint.includes('999999') ? { expectError: true } : {};
      
      if (!testConfig.expectError) {
        result.errors.push(`HTTP ${response.status}: ${response.statusText}`);
        if (isApiErrorResponse(data)) {
          result.errors.push(`API Error: ${data.error} (${data.code})`);
        }
      } else {
        // Expected error, this is success
        result.success = response.status === 404 && isApiErrorResponse(data);
        if (!result.success) {
          result.errors.push(`Expected 404 error but got ${response.status}`);
        }
      }
      return result;
    }

    // Validate response structure for production run endpoints
    if (endpoint.includes('/production-runs/') && !endpoint.includes('/production-runs?')) {
      const validationErrors = validateProductionRunDetail(data);
      result.errors.push(...validationErrors);
    }

    result.success = result.errors.length === 0;
    return result;

  } catch (error) {
    result.errors.push(`Network/Parse Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

function validateProductionRunDetail(data: any): string[] {
  const errors: string[] = [];

  // Required fields that frontend components expect
  const requiredFields = [
    'id', 'batchNumber', 'dailyLot', 'recipe', 'batchIngredients', 'pallets'
  ];

  const requiredRecipeFields = ['id', 'name', 'version'];

  // Check top-level required fields
  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Check recipe structure (this was the main issue)
  if (data.recipe) {
    if (typeof data.recipe !== 'object') {
      errors.push('recipe should be an object');
    } else {
      for (const field of requiredRecipeFields) {
        if (!(field in data.recipe)) {
          errors.push(`Missing required recipe field: ${field}`);
        }
      }
      
      // Check specific field types that caused runtime errors
      if (typeof data.recipe.name !== 'string') {
        errors.push('recipe.name should be a string');
      }
      if (typeof data.recipe.version !== 'string') {
        errors.push('recipe.version should be a string');
      }
    }
  } else {
    errors.push('recipe object is missing or null');
  }

  // Check arrays
  if (!Array.isArray(data.batchIngredients)) {
    errors.push('batchIngredients should be an array');
  }

  if (!Array.isArray(data.pallets)) {
    errors.push('pallets should be an array');
  }

  // Check nested ingredient structure
  if (Array.isArray(data.batchIngredients)) {
    data.batchIngredients.forEach((ingredient: any, index: number) => {
      if (!ingredient.ingredient) {
        errors.push(`batchIngredients[${index}].ingredient is missing`);
      }
      if (!ingredient.ingredientLot) {
        errors.push(`batchIngredients[${index}].ingredientLot is missing`);
      }
    });
  }

  return errors;
}

async function runTests() {
  console.log('🧪 Testing API Structure Consistency\n');

  const tests = [
    // Test individual production run (the main issue)
    { endpoint: '/api/production-runs/68', method: 'GET' as const },
    
    // Test update functionality
    { 
      endpoint: '/api/production-runs/68', 
      method: 'PUT' as const, 
      body: { actualQuantity: 6, notes: 'Test update from validation script' }
    },

    // Test another production run
    { endpoint: '/api/production-runs/67', method: 'GET' as const },

    // Test error handling (expect 404)
    { endpoint: '/api/production-runs/999999', method: 'GET' as const, expectError: true }
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    console.log(`Testing ${test.method} ${test.endpoint}...`);
    const result = await testApiEndpoint(test.endpoint, test.method, test.body);
    results.push(result);

    if (result.success) {
      console.log(`✅ ${test.endpoint} - PASSED`);
    } else {
      console.log(`❌ ${test.endpoint} - FAILED:`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! API structure is consistent with frontend expectations.');
  } else {
    console.log('⚠️  Some tests failed. Review the errors above.');
    process.exit(1);
  }

  // Example of successful response structure
  const successfulResponse = results.find(r => r.success && r.endpoint.includes('/production-runs/68'));
  if (successfulResponse) {
    console.log('\n📋 Sample API Response Structure:');
    console.log('Recipe object:', JSON.stringify(successfulResponse.data.recipe, null, 2));
    console.log('First batch ingredient:', JSON.stringify(successfulResponse.data.batchIngredients[0], null, 2));
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests, validateProductionRunDetail };
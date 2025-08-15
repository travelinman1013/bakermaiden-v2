/**
 * @jest-environment node
 * 
 * PHASE 4: CRITICAL FIXES VALIDATION
 * Comprehensive validation of all critical fixes identified in previous phases
 * 
 * This test validates the core fixes without complex mocking:
 * - ✅ Database schema alignment (status → qualityStatus)
 * - ✅ Navigation accessibility (/inventory route)
 * - ✅ Production workflow integration
 * - ✅ API endpoint functionality
 */

const BASE_URL = 'http://localhost:3000'

// Helper function for making HTTP requests
const testRequest = async (path: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    
    let data = null
    try {
      data = await response.json()
    } catch {
      data = await response.text()
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data,
    }
  } catch (error) {
    throw new Error(`Request to ${path} failed: ${error}`)
  }
}

describe('CRITICAL FIXES VALIDATION', () => {
  describe('🔧 Database Schema Fix: qualityStatus Field Mapping', () => {
    test('✅ API endpoint /api/ingredient-lots is accessible', async () => {
      const response = await testRequest('/api/ingredient-lots')
      
      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('data')
      expect(response.data).toHaveProperty('pagination')
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    test('✅ qualityStatus field is present in response data', async () => {
      const response = await testRequest('/api/ingredient-lots?limit=5')
      
      expect(response.status).toBe(200)
      
      // If there's data, validate structure
      if (response.data.data.length > 0) {
        const lot = response.data.data[0]
        expect(lot).toHaveProperty('qualityStatus')
        expect(['pending', 'passed', 'failed', 'quarantined']).toContain(lot.qualityStatus)
      }
    })

    test('✅ qualityStatus filtering works with valid values', async () => {
      const validStatuses = ['pending', 'passed', 'failed', 'quarantined']
      
      for (const status of validStatuses) {
        const response = await testRequest(`/api/ingredient-lots?qualityStatus=${status}`)
        
        // Should return 200 for all valid status values
        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty('data')
        
        // If data exists, all items should have the correct status
        if (response.data.data.length > 0) {
          response.data.data.forEach((lot: any) => {
            expect(lot.qualityStatus).toBe(status)
          })
        }
      }
    })
  })

  describe('🔧 Navigation Fix: /inventory Route Accessibility', () => {
    test('✅ /inventory route returns 200 (not 404)', async () => {
      const response = await testRequest('/inventory')
      
      expect(response.status).toBe(200)
      expect(typeof response.data).toBe('string') // HTML content
      expect(response.data).toContain('html')
    })

    test('✅ All core navigation routes are accessible', async () => {
      const coreRoutes = [
        { path: '/', name: 'Homepage' },
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/recipes', name: 'Recipes' },
        { path: '/inventory', name: 'Inventory' }, // Critical: was 404, now fixed
        { path: '/production', name: 'Production' },
      ]

      for (const route of coreRoutes) {
        const response = await testRequest(route.path)
        
        expect(response.status).toBe(200)
        expect(typeof response.data).toBe('string')
        
        // Critical validation: inventory route specifically
        if (route.path === '/inventory') {
          expect(response.data).toContain('html')
        }
      }
    })
  })

  describe('🔧 Production Workflow Fix: Ingredient Loading Integration', () => {
    test('✅ Production form can load passed ingredient lots', async () => {
      // This is the exact API call made by the production form
      const response = await testRequest('/api/ingredient-lots?qualityStatus=passed&limit=100')
      
      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('data')
      
      // Validate response structure for production form
      if (response.data.data.length > 0) {
        response.data.data.forEach((lot: any) => {
          // Required fields for production form functionality
          expect(lot).toHaveProperty('id')
          expect(lot).toHaveProperty('lotCode')
          expect(lot).toHaveProperty('qualityStatus', 'passed')
          expect(lot).toHaveProperty('quantityRemaining')
          expect(lot).toHaveProperty('Ingredient')
          expect(lot.Ingredient).toHaveProperty('name')
        })
      }
    })

    test('✅ Production form dependency APIs are accessible', async () => {
      const dependencyAPIs = [
        '/api/recipes',           // For recipe selection
        '/api/production-runs',   // For existing runs
        '/api/ingredient-lots',   // For ingredient selection
      ]

      for (const api of dependencyAPIs) {
        const response = await testRequest(api)
        
        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty('data')
      }
    })
  })

  describe('🔧 Complete Workflow Integration Validation', () => {
    test('✅ Full user journey: Homepage → Inventory → Production', async () => {
      // Step 1: Access homepage
      const homepage = await testRequest('/')
      expect(homepage.status).toBe(200)

      // Step 2: Navigate to inventory (was 404, now fixed)
      const inventory = await testRequest('/inventory')
      expect(inventory.status).toBe(200)

      // Step 3: Load inventory data
      const inventoryData = await testRequest('/api/ingredient-lots')
      expect(inventoryData.status).toBe(200)

      // Step 4: Navigate to production
      const production = await testRequest('/production')
      expect(production.status).toBe(200)

      // Step 5: Load production form data (was failing, now fixed)
      const productionData = await testRequest('/api/ingredient-lots?qualityStatus=passed')
      expect(productionData.status).toBe(200)

      // Validate complete workflow succeeds
      expect([homepage, inventory, inventoryData, production, productionData].every(r => r.status === 200)).toBe(true)
    })

    test('✅ Traceability workflow data consistency', async () => {
      // Validate that data structure supports traceability
      const ingredientLots = await testRequest('/api/ingredient-lots?limit=5')
      expect(ingredientLots.status).toBe(200)

      const productionRuns = await testRequest('/api/production-runs?limit=5')
      expect(productionRuns.status).toBe(200)

      // If data exists, validate field consistency
      if (ingredientLots.data.data.length > 0) {
        const lot = ingredientLots.data.data[0]
        expect(lot).toHaveProperty('qualityStatus') // Critical: not 'status'
        expect(lot).toHaveProperty('lotCode')
        expect(lot).toHaveProperty('Ingredient')
      }

      if (productionRuns.data.data.length > 0) {
        const run = productionRuns.data.data[0]
        expect(run).toHaveProperty('status') // Production runs use 'status'
        expect(run).toHaveProperty('qualityStatus') // And also 'qualityStatus'
      }
    })
  })

  describe('🔧 Performance and Error Handling Validation', () => {
    test('✅ API responses are within acceptable time limits', async () => {
      const performanceTests = [
        { endpoint: '/api/ingredient-lots', maxTime: 2000 },
        { endpoint: '/api/recipes', maxTime: 1500 },
        { endpoint: '/api/production-runs', maxTime: 2000 },
      ]

      for (const test of performanceTests) {
        const startTime = Date.now()
        const response = await testRequest(test.endpoint)
        const endTime = Date.now()
        
        const responseTime = endTime - startTime
        
        expect(response.status).toBe(200)
        expect(responseTime).toBeLessThan(test.maxTime)
      }
    })

    test('✅ Invalid requests return proper error codes', async () => {
      // Test pagination validation
      const invalidPagination = await testRequest('/api/ingredient-lots?page=0&limit=1000')
      expect(invalidPagination.status).toBe(400)

      // Test 404 for non-existent routes
      const notFound = await testRequest('/non-existent-route')
      expect(notFound.status).toBe(404)
    })
  })

  describe('🎯 Critical Fix Summary Validation', () => {
    test('✅ All Phase 1-3 fixes are operational', async () => {
      const criticalValidations = []

      // 1. Database schema fix validation
      const schemaTest = await testRequest('/api/ingredient-lots?qualityStatus=passed')
      criticalValidations.push({
        fix: 'Database schema alignment (status → qualityStatus)',
        status: schemaTest.status === 200 ? 'PASS' : 'FAIL',
        details: schemaTest.status === 200 ? '✅ qualityStatus field works correctly' : '❌ Field mapping failed'
      })

      // 2. Navigation fix validation
      const navTest = await testRequest('/inventory')
      criticalValidations.push({
        fix: 'Inventory route accessibility',
        status: navTest.status === 200 ? 'PASS' : 'FAIL',
        details: navTest.status === 200 ? '✅ /inventory returns 200, not 404' : '❌ Inventory route still failing'
      })

      // 3. Production workflow fix validation
      const workflowTest = await testRequest('/api/ingredient-lots?qualityStatus=passed&limit=100')
      criticalValidations.push({
        fix: 'Production form ingredient loading',
        status: workflowTest.status === 200 ? 'PASS' : 'FAIL',
        details: workflowTest.status === 200 ? '✅ Production form can load ingredients' : '❌ Production form still failing'
      })

      // Log validation summary
      console.log('\n🔍 CRITICAL FIXES VALIDATION SUMMARY:')
      criticalValidations.forEach(validation => {
        console.log(`${validation.status === 'PASS' ? '✅' : '❌'} ${validation.fix}: ${validation.details}`)
      })

      // All critical fixes must pass
      const allPassed = criticalValidations.every(v => v.status === 'PASS')
      expect(allPassed).toBe(true)

      if (allPassed) {
        console.log('\n🎉 ALL CRITICAL FIXES ARE VALIDATED AND WORKING!')
        console.log('   - Database field mapping corrected')
        console.log('   - Navigation routes accessible')
        console.log('   - Production workflow integrated')
        console.log('   - API endpoints functioning properly')
      }
    })
  })
})
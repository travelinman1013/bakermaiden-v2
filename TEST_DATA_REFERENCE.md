# BakerMaiden Test Data Reference

This document outlines the dummy data available for hand testing the BakerMaiden application.

## 📊 Database Contents

- **👥 Users**: 3 (different roles for testing)
- **🥄 Ingredients**: 8 (bakery essentials)
- **📦 Ingredient Lots**: 5 (with traceability codes)
- **📝 Recipes**: 4 (various bakery items)
- **🏭 Production Runs**: 3 (completed batches)
- **🔗 Batch Ingredients**: 7 (traceability links)
- **📦 Finished Pallets**: 3 (packaged products)
- **📋 Audit Logs**: 3 (compliance trail)

## 👥 Test Users

### Sarah Baker (head_baker)
- **Email**: sarah.baker@bakermaiden.com
- **Role**: head_baker
- **Use for**: Creating recipes, managing production runs

### Mike Johnson (assistant_baker)
- **Email**: mike.assistant@bakermaiden.com
- **Role**: assistant_baker
- **Use for**: Production floor operations, ingredient handling

### Lisa Chen (quality_inspector)
- **Email**: lisa.qa@bakermaiden.com
- **Role**: quality_inspector
- **Use for**: Quality control, batch approval

## 🥄 Available Ingredients

1. **All-Purpose Flour** - King Arthur Baking (KA-APF-50)
2. **Unsalted Butter** - Challenge Dairy (CD-UB-1)
3. **Large Eggs** - Farm Fresh Eggs (FFE-LG-12)
4. **Granulated Sugar** - C&H Sugar (CH-GS-25)
5. **Semi-Sweet Chocolate Chips** - Guittard (GT-SSCC-25)
6. **Pure Vanilla Extract** - Nielsen-Massey (NM-VE-16)
7. **Baking Powder** - Clabber Girl (CG-BP-10)
8. **Sea Salt** - Diamond Crystal (DC-SS-3)

## 📦 Ingredient Lots (for Traceability Testing)

| Internal Lot Code | Ingredient | Supplier Lot | Status | Remaining Qty |
|-------------------|------------|--------------|--------|---------------|
| BM24081501 | All-Purpose Flour | KA-APF-240815 | passed | ~30 lbs |
| BM24081002 | Unsalted Butter | CD-UB-240810 | passed | ~15 lbs |
| BM24081203 | Large Eggs | FFE-LG-240812 | passed | ~120 eggs |
| BM24080104 | Vanilla Extract | NM-VE-240801 | passed | 4.5 oz |
| BM24080505 | Baking Powder | CG-BP-240805 | passed | 9.3 lbs |

## 📝 Test Recipes

1. **Classic Chocolate Chip Cookies** (v2.1) - Yields 48 cookies
2. **Vanilla Birthday Cake** (v3.0) - Yields 1 9-inch cake
3. **Double Chocolate Brownies** (v1.8) - Yields 24 brownies
4. **Artisan Sourdough Bread** (v1.5) - Yields 2 loaves

## 🏭 Production Runs (for Traceability Testing)

### DL20250815-001 (Cookies)
- **Recipe**: Classic Chocolate Chip Cookies
- **Planned**: 96 cookies | **Actual**: 94 cookies
- **Status**: approved
- **Operator**: Sarah Baker | **Assistant**: Mike Johnson
- **Inspector**: Lisa Chen

### DL20250814-001 (Brownies)
- **Recipe**: Double Chocolate Brownies
- **Planned**: 48 brownies | **Actual**: 46 brownies
- **Status**: approved
- **Operator**: Sarah Baker | **Assistant**: Mike Johnson

### DL20250813-001 (Bread)
- **Recipe**: Artisan Sourdough Bread
- **Planned**: 4 loaves | **Actual**: 4 loaves
- **Status**: approved
- **Operator**: Mike Johnson | **Assistant**: Sarah Baker

## 📦 Finished Pallets

| Pallet Code | Product | Quantity | Status | Location |
|-------------|---------|----------|--------|----------|
| PLT001-01 | Cookies | 94 units | ready | warehouse |
| PLT002-01 | Brownies | 46 units | shipped | shipped |
| PLT003-01 | Bread | 4 loaves | ready | loading_dock |

## 🔍 Test Scenarios

### 1. Forward Traceability (Ingredient → Product)
- **Start with**: Flour lot BM24081501
- **Find**: All production runs that used this flour
- **Result**: Should show cookies, brownies, and bread production runs

### 2. Backward Traceability (Product → Ingredients)
- **Start with**: Pallet PLT001-01 (cookies)
- **Find**: All ingredient lots used in production run DL20250815-001
- **Result**: Should show flour, butter, eggs, and other ingredients

### 3. Recall Simulation
- **Scenario**: Flour supplier KA-APF-50 has quality issue
- **Find**: All products made with this supplier's ingredients
- **Action**: Generate recall list and impact assessment

### 4. Production Dashboard Testing
- **Recent Runs**: View last 7 days of production
- **Quality Status**: Filter by approved/pending batches
- **Yield Analysis**: Compare planned vs actual quantities

### 5. Inventory Management
- **Low Stock**: Check ingredients with <10 units remaining
- **Expiring Soon**: Find lots expiring within 30 days
- **Quality Control**: View pending quality approvals

## 🏃‍♀️ Quick Start Testing Workflow

1. **Login**: Use any test user email (no password required in dev)
2. **Dashboard**: View production statistics and recent activity
3. **Recipes**: Browse and edit existing recipes
4. **Inventory**: Check ingredient lots and quantities
5. **Production**: Create new production run using existing recipe
6. **Traceability**: Test lot lookup and recall scenarios
7. **Reports**: Export data for regulatory compliance

## 🚨 Testing Focus Areas

### Critical Business Features
- ✅ Recipe management (CRUD operations)
- ✅ Production run creation and tracking
- ✅ Lot traceability (forward and backward)
- ✅ Inventory quantity updates
- ✅ Quality status workflows

### FDA Compliance Features
- ✅ Batch record creation
- ✅ Ingredient lot tracking
- ✅ Audit trail logging
- ✅ Recall capability (sub-5 minute response)
- ✅ Production documentation

### User Experience
- ✅ Mobile-responsive design
- ✅ Production floor tablet optimization
- ✅ Fast page loads (<2 seconds)
- ✅ Intuitive navigation
- ✅ Error handling and validation

## 📝 Notes for Testers

- All data is realistic bakery operations data
- Quantity calculations account for typical waste/yield
- Dates are relative to current date for realistic testing
- Traceability links are complete across all models
- Quality status reflects normal production approval flow

The database is now ready for comprehensive hand testing of all BakerMaiden features!
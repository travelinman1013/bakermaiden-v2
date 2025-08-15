# BakerMaiden Database Migration Guide
## Phase 1: Lot Traceability Enhancement

### Overview
This guide provides step-by-step instructions for migrating from the basic BakerMaiden schema to the enhanced lot traceability and compliance schema.

### Pre-Migration Checklist

#### 1. Environment Setup
```bash
# Install testing dependencies
npm install --save-dev @types/jest jest jest-junit ts-jest

# Verify current schema
npx prisma validate

# Check database connection
npx prisma db pull --preview-feature
```

#### 2. Backup Strategy
```bash
# Create database backup (PostgreSQL)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# For Supabase users
# Use Supabase dashboard to create backup or export data
```

#### 3. Environment Variables
Create or update your `.env` file:
```env
# Production database
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"

# Test database (separate database recommended)
TEST_DATABASE_URL="postgresql://username:password@host:port/test_database?schema=public"

# Optional: Connection settings
DATABASE_CONNECTION_LIMIT=10
DATABASE_POOL_TIMEOUT=20000
```

### Migration Steps

#### Step 1: Schema Validation
```bash
# Validate the new schema
npx prisma validate

# Format the schema file
npx prisma format
```

#### Step 2: Generate Migration
```bash
# Generate migration for the schema changes
npx prisma migrate dev --name "enhance_lot_traceability"
```

This will create a migration file that:
- Adds new enum types
- Creates new tables (Ingredient, IngredientLot, BatchIngredient, AuditLog)
- Enhances existing tables (ProductionRun, Pallet, Recipe)
- Creates necessary indexes and constraints

#### Step 3: Test Migration on Test Database
```bash
# Setup test database
export TEST_DATABASE_URL="your_test_database_url"

# Run migration on test database
TEST_DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy

# Run tests to validate migration
npm run test:db
```

#### Step 4: Data Migration (if needed)
If you have existing data that needs to be preserved and migrated:

```sql
-- Example data migration script (run after schema migration)

-- Migrate existing ingredient data (if any exists in a different format)
-- This is a template - adjust based on your current data structure
INSERT INTO ingredients (name, type, unit_of_measure, current_stock, created_at)
SELECT 
  name,
  'OTHER'::ingredient_type,  -- Default type, update as needed
  'units',  -- Default unit, update as needed
  0,  -- Default stock
  NOW()
FROM old_ingredient_table
WHERE name NOT IN (SELECT name FROM ingredients);

-- Add default values for new ProductionRun fields
UPDATE production_runs 
SET 
  batch_number = 'MIGRATED-' || id::text,
  planned_quantity = COALESCE(actual_quantity, 0),
  unit_of_measure = 'units',
  status = 'COMPLETED'::batch_status,
  quality_status = 'PASSED'::quality_status
WHERE batch_number IS NULL;

-- Add default pallet numbers for existing pallets
UPDATE pallets
SET pallet_number = 'PAL-' || id::text || '-MIGRATED'
WHERE pallet_number IS NULL;
```

#### Step 5: Production Deployment
```bash
# Deploy to production (AFTER testing)
npx prisma migrate deploy

# Generate new Prisma client
npx prisma generate
```

### Post-Migration Validation

#### 1. Schema Verification
```bash
# Check that all tables were created correctly
npx prisma db pull

# Compare with expected schema
git diff prisma/schema.prisma
```

#### 2. Run Comprehensive Tests
```bash
# Run all database tests
npm run test:db

# Run specific test suites
npm run test:schema
npm run test:traceability
npm run test:performance
```

#### 3. Data Integrity Checks
```sql
-- Verify foreign key relationships
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' 
  AND constraint_type = 'FOREIGN KEY';

-- Check unique constraints
SELECT 
  table_name,
  constraint_name
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public' 
  AND constraint_type = 'UNIQUE';

-- Verify enum types
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'BatchStatus';
```

### Rollback Plan

If issues arise during migration:

#### 1. Immediate Rollback
```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

#### 2. Selective Rollback
```bash
# Reset to previous migration
npx prisma migrate reset

# Apply only previous migrations
npx prisma migrate deploy --to MIGRATION_ID
```

### Performance Optimization

#### 1. Create Additional Indexes
```sql
-- Add indexes for common query patterns
CREATE INDEX idx_ingredient_lots_supplier ON ingredient_lots(supplier_name);
CREATE INDEX idx_production_runs_date_range ON production_runs(actual_start_time, actual_end_time);
CREATE INDEX idx_batch_ingredients_traceability ON batch_ingredients(production_run_id, ingredient_lot_id);
CREATE INDEX idx_pallets_status_location ON pallets(status, location);

-- Composite indexes for traceability queries
CREATE INDEX idx_ingredient_lots_status_quality ON ingredient_lots(status, quality_status);
CREATE INDEX idx_production_runs_status_quality ON production_runs(status, quality_status, created_at);
```

#### 2. Analyze Query Performance
```sql
-- Enable query analysis
SET enable_seqscan = off;  -- Force index usage for testing

-- Analyze common queries
EXPLAIN ANALYZE SELECT * FROM ingredient_lots 
WHERE supplier_name = 'Test Supplier' 
AND status = 'IN_USE';
```

### Validation Checklist

- [ ] Schema validation passes (`npx prisma validate`)
- [ ] Migration generates without errors
- [ ] Test database migration completes successfully
- [ ] All database tests pass
- [ ] Performance tests meet requirements
- [ ] Production backup created
- [ ] Production migration completed
- [ ] Post-migration data integrity checks pass
- [ ] Application functionality verified
- [ ] Rollback plan tested and documented

### Common Issues and Solutions

#### Issue 1: Enum Type Conflicts
```bash
# Error: Enum already exists
# Solution: Drop existing enum if safe
DROP TYPE IF EXISTS "BatchStatus" CASCADE;
```

#### Issue 2: Unique Constraint Violations
```sql
-- Error: Duplicate values for unique fields
-- Solution: Update duplicate values before migration
UPDATE production_runs 
SET batch_number = batch_number || '-' || id 
WHERE batch_number IN (
  SELECT batch_number FROM production_runs 
  GROUP BY batch_number HAVING COUNT(*) > 1
);
```

#### Issue 3: Foreign Key Constraint Failures
```sql
-- Error: Referenced record doesn't exist
-- Solution: Create missing records or update references
INSERT INTO recipes (name, created_by) 
SELECT DISTINCT 'Unknown Recipe', 'system' 
WHERE NOT EXISTS (SELECT 1 FROM recipes);
```

#### Issue 4: Data Type Mismatches
```sql
-- Error: Cannot cast varchar to integer
-- Solution: Update data types or transform data
UPDATE table_name 
SET numeric_field = CASE 
  WHEN text_field ~ '^[0-9]+$' THEN text_field::integer 
  ELSE 0 
END;
```

### Testing Strategy

#### 1. Pre-Migration Testing
- Test schema generation on empty database
- Test with sample data
- Performance test with realistic data volumes
- Validate all relationships and constraints

#### 2. Migration Testing
- Test migration on copy of production data
- Validate data integrity after migration
- Test application functionality with new schema
- Performance test critical queries

#### 3. Post-Migration Testing
- Full application testing
- Load testing with new schema
- Backup and restore testing
- Rollback procedure testing

### Documentation Requirements

#### 1. Migration Log
Document:
- Migration date and time
- Database version before/after
- Any data transformations performed
- Performance impact measurements
- Issues encountered and resolutions

#### 2. Schema Documentation
Update:
- API documentation
- Database ERD diagrams
- Query examples
- Index optimization notes

### Support and Monitoring

#### 1. Performance Monitoring
```sql
-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

#### 2. Error Monitoring
```sql
-- Monitor constraint violations
SELECT schemaname, tablename, attname, n_tup_ins, n_tup_upd 
FROM pg_stat_user_tables 
JOIN pg_attribute ON pg_attribute.attrelid = pg_stat_user_tables.relid;
```

### Next Steps (Phase 2 Preparation)

1. **Recipe Ingredients**: Plan junction table for recipe formulations
2. **Cost Tracking**: Design cost allocation system
3. **Advanced Reporting**: Plan analytics and dashboard requirements
4. **Mobile Integration**: Consider field data collection needs
5. **API Optimization**: Plan GraphQL or optimized REST endpoints
6. **Real-time Features**: Consider WebSocket integration needs

### Contact and Support

For migration support:
- Database Administrator: [Contact Info]
- Backend Architect: [Contact Info]
- DevOps Engineer: [Contact Info]
- Project Manager: [Contact Info]
# BakerMaiden Database Schema Documentation
## Phase 1: Lot Traceability and Compliance Enhancement

### Overview
This document describes the enhanced database schema for BakerMaiden's production tracking system, designed to meet FDA and regulatory compliance requirements with full lot traceability from ingredient to finished product.

### Schema Architecture

#### Core Models

##### Recipe Model
```prisma
model Recipe {
  id             Int              @id @default(autoincrement())
  name           String           @unique
  description    String?
  version        String           @default("1.0")
  isActive       Boolean          @default(true)
  
  // Audit fields
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  createdBy      String?          // User ID who created the recipe
  updatedBy      String?          // User ID who last updated the recipe
  
  productionRuns ProductionRun[]
}
```

**Purpose**: Manages recipe definitions with versioning and audit trails.
**Key Features**: 
- Unique recipe names
- Version control for recipe changes
- Active/inactive status management
- Complete audit trail

##### Ingredient Model
```prisma
model Ingredient {
  id              Int              @id @default(autoincrement())
  name            String           @unique
  description     String?
  type            IngredientType   // FLOUR, SUGAR, DAIRY, etc.
  status          IngredientStatus @default(ACTIVE)
  
  // Supplier information
  primarySupplier String?
  supplierCode    String?
  alternateSuppliers String[]
  
  // Inventory tracking
  unitOfMeasure   String
  currentStock    Float            @default(0)
  minimumStock    Float            @default(0)
  maximumStock    Float?
  reorderPoint    Float?
  
  // Cost tracking
  lastCostPerUnit Float?
  averageCostPerUnit Float?
  
  // Allergen and compliance
  allergens       String[]         // Array of allergens
  certifications  String[]         // Organic, Kosher, etc.
  storageRequirements String?
  shelfLifeDays   Int?
  
  // Relationships
  ingredientLots  IngredientLot[]
  batchIngredients BatchIngredient[]
  
  // Audit fields
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  createdBy       String?
  updatedBy       String?
}
```

**Purpose**: Master ingredient catalog with supplier, inventory, and compliance data.
**Key Features**:
- Comprehensive supplier management
- Inventory level tracking
- Allergen and certification tracking
- Cost management

##### IngredientLot Model
```prisma
model IngredientLot {
  id              Int            @id @default(autoincrement())
  lotCode         String         @unique // Supplier's lot/batch code
  internalLotCode String?        // Internal tracking code
  
  // Lot details
  quantityReceived Float          // Amount received
  quantityRemaining Float         // Current remaining amount
  unitOfMeasure   String
  
  // Dates
  receivedDate    DateTime
  expirationDate  DateTime?
  bestByDate      DateTime?
  manufactureDate DateTime?
  
  // Supplier information
  supplierName    String
  supplierLotCode String?
  invoiceNumber   String?
  purchaseOrder   String?
  
  // Quality and compliance
  qualityStatus   QualityStatus  @default(PENDING)
  qualityNotes    String?
  qualityTestResults Json?       // Flexible field for test results
  certificateOfAnalysis String?  // File path or URL
  
  // Status and location
  status          LotStatus      @default(RECEIVED)
  storageLocation String?
  storageTemp     Float?
  storageHumidity Float?
  
  // Relationships
  ingredientId    Int
  ingredient      Ingredient     @relation(fields: [ingredientId], references: [id])
  batchIngredients BatchIngredient[]
  
  // Audit fields
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdBy       String?
  updatedBy       String?
}
```

**Purpose**: Individual lot tracking for complete ingredient traceability.
**Key Features**:
- Unique lot identification
- Complete supplier documentation
- Quality control status tracking
- Environmental condition monitoring
- Quantity tracking (received vs remaining)

##### ProductionRun Model (Enhanced)
```prisma
model ProductionRun {
  id              Int            @id @default(autoincrement())
  batchNumber     String         @unique // Unique batch identifier
  dailyLot        String         // Existing field
  cakeLot         String         // Existing field
  icingLot        String         // Existing field
  
  // Enhanced production tracking
  plannedQuantity Int            // Expected yield
  actualQuantity  Int?           // Actual produced quantity
  unitOfMeasure   String         @default("units")
  
  // Production timing
  plannedStartTime DateTime?
  actualStartTime  DateTime?
  actualEndTime    DateTime?
  durationMinutes  Int?          // Calculated duration
  
  // Staff and equipment tracking
  primaryOperator  String?       // Staff member responsible
  assistantOperators String[]    // Array of additional staff
  productionLine   String?       // Equipment/station used
  shift           String?        // Production shift
  
  // Quality control
  qualityStatus    QualityStatus  @default(PENDING)
  qualityNotes     String?
  qualityCheckBy   String?        // QC inspector
  qualityCheckAt   DateTime?
  
  // Batch status and notes
  status          BatchStatus    @default(PLANNED)
  productionNotes String?
  issuesEncountered String?
  
  // Environmental conditions
  temperature     Float?         // Production temperature
  humidity        Float?         // Production humidity
  
  // Relationships
  recipeId        Int
  recipe          Recipe         @relation(fields: [recipeId], references: [id])
  pallets         Pallet[]
  batchIngredients BatchIngredient[]
  
  // Audit fields
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdBy       String?
  updatedBy       String?
}
```

**Purpose**: Enhanced production run tracking with comprehensive compliance data.
**Key Features**:
- Unique batch identification
- Complete production timeline tracking
- Staff assignment and equipment tracking
- Quality control checkpoints
- Environmental condition monitoring
- Yield tracking (planned vs actual)

##### BatchIngredient Model (Traceability Junction)
```prisma
model BatchIngredient {
  id              Int            @id @default(autoincrement())
  
  // Quantities used
  quantityUsed    Float          // Amount of this ingredient lot used
  unitOfMeasure   String
  percentageOfTotal Float?       // What % of total ingredient this lot represents
  
  // Usage details
  addedAt         DateTime?      // When this ingredient was added to batch
  addedBy         String?        // Who added the ingredient
  usageNotes      String?        // Special notes about usage
  
  // Relationships
  productionRunId Int
  productionRun   ProductionRun  @relation(fields: [productionRunId], references: [id], onDelete: Cascade)
  
  ingredientId    Int
  ingredient      Ingredient     @relation(fields: [ingredientId], references: [id])
  
  ingredientLotId Int
  ingredientLot   IngredientLot  @relation(fields: [ingredientLotId], references: [id])
  
  // Audit fields
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdBy       String?
  updatedBy       String?
  
  // Ensure one record per production run + ingredient lot combination
  @@unique([productionRunId, ingredientLotId])
}
```

**Purpose**: Critical junction table that enables complete traceability from ingredient lots to production runs.
**Key Features**:
- Links specific ingredient lots to specific production runs
- Tracks exact quantities used
- Records timing and personnel information
- Enables forward and backward traceability
- Prevents duplicate entries with unique constraint

##### Enhanced Pallet Model
```prisma
model Pallet {
  id              Int           @id @default(autoincrement())
  palletNumber    String        @unique // Unique pallet identifier
  weight          Float?        // Pallet weight in kg
  itemCount       Int?          // Number of items on pallet
  
  // Pallet location and status
  location        String?       // Current storage location
  status          String        @default("ACTIVE") // ACTIVE, SHIPPED, RECALLED, etc.
  
  // Shipping information
  shippedAt       DateTime?
  customerOrder   String?       // Customer order reference
  
  // Relationships
  productionRunId Int
  productionRun   ProductionRun @relation(fields: [productionRunId], references: [id], onDelete: Cascade)
  
  // Audit fields
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  createdBy       String?
  updatedBy       String?
}
```

**Purpose**: Enhanced finished product tracking with shipping and location management.
**Key Features**:
- Unique pallet identification
- Location and status tracking
- Customer order linkage
- Shipping date tracking

##### AuditLog Model
```prisma
model AuditLog {
  id            Int            @id @default(autoincrement())
  tableName     String         // Which table was modified
  recordId      Int            // ID of the modified record
  action        String         // INSERT, UPDATE, DELETE
  oldValues     Json?          // Previous values (for UPDATE/DELETE)
  newValues     Json?          // New values (for INSERT/UPDATE)
  
  // Change tracking
  changedBy     String         // User ID who made the change
  changedAt     DateTime       @default(now())
  ipAddress     String?        // IP address of change
  userAgent     String?        // Browser/client info
  
  // Context
  reason        String?        // Reason for change
}
```

**Purpose**: Comprehensive audit trail for regulatory compliance.
**Key Features**:
- Tracks all database changes
- Before/after value comparison
- User and session tracking
- Change reasoning documentation

### Enums

```prisma
enum BatchStatus {
  PLANNED
  IN_PROGRESS
  QUALITY_CHECK
  COMPLETED
  FAILED
  RECALLED
}

enum QualityStatus {
  PENDING
  PASSED
  FAILED
  CONDITIONAL_PASS
}

enum IngredientType {
  FLOUR
  SUGAR
  DAIRY
  EGGS
  FATS
  LEAVENING
  FLAVORING
  PRESERVATIVE
  ADDITIVE
  PACKAGING
  OTHER
}

enum IngredientStatus {
  ACTIVE
  DISCONTINUED
  RECALLED
  EXPIRED
}

enum LotStatus {
  RECEIVED
  QUALITY_APPROVED
  IN_USE
  DEPLETED
  EXPIRED
  QUARANTINED
  RECALLED
}
```

### Traceability Scenarios

#### Forward Traceability (Ingredient Lot → Products)
1. **Query**: Given an ingredient lot code, find all affected products
2. **Use Case**: Supplier notification of potential contamination
3. **Implementation**: Query `IngredientLot` → `BatchIngredient` → `ProductionRun` → `Pallet`

#### Backward Traceability (Product → Ingredient Lots)
1. **Query**: Given a product/pallet, find all ingredient lots used
2. **Use Case**: Customer complaint investigation
3. **Implementation**: Query `Pallet` → `ProductionRun` → `BatchIngredient` → `IngredientLot`

#### Recall Management
1. **Process**: Update ingredient lot status to RECALLED
2. **Cascade**: Update all associated production runs and pallets to RECALLED
3. **Documentation**: Create audit log entries for all changes
4. **Reporting**: Generate comprehensive recall reports

### Performance Considerations

#### Indexes
The schema is designed with the following index strategy:
- **Unique constraints**: Ensure data integrity
- **Foreign keys**: Automatic indexes for relationship queries
- **Date fields**: Indexed for time-range queries
- **Status fields**: Indexed for filtering operations
- **Search fields**: Consider composite indexes for common query patterns

#### Query Patterns
- **Pagination**: Implement limit/offset for large result sets
- **Selective fields**: Use `select` to reduce data transfer
- **Relationship loading**: Use `include` strategically to avoid N+1 queries

### Migration Strategy

1. **Schema Validation**: Run `npx prisma validate`
2. **Generate Migration**: Run `npx prisma migrate dev`
3. **Test Migration**: Run on test database first
4. **Backup Production**: Always backup before production migration
5. **Deploy**: Run `npx prisma migrate deploy` in production

### Testing Strategy

1. **Schema Tests**: Validate model relationships and constraints
2. **Traceability Tests**: Test forward and backward tracing scenarios
3. **Performance Tests**: Validate query performance under load
4. **Compliance Tests**: Test recall scenarios and audit logging

### Compliance Features

#### FDA Requirements Met
- **Complete ingredient traceability**: From supplier to finished product
- **Lot identification**: Unique codes for all ingredients and products
- **Production records**: Complete documentation of all production activities
- **Quality control**: Systematic quality checkpoints and documentation
- **Recall capability**: Ability to quickly identify and isolate affected products
- **Audit trail**: Complete change history for all critical data

#### Documentation Standards
- **Lot codes**: Standardized format for traceability
- **Batch numbers**: Unique identification for production runs
- **Quality records**: Systematic documentation of all QC activities
- **Personnel records**: Tracking of who performed what activities
- **Environmental conditions**: Temperature and humidity logging

### Security Considerations

1. **Data Integrity**: Constraints prevent invalid data entry
2. **Audit Logging**: All changes are tracked for compliance
3. **Access Control**: User identification in all audit fields
4. **Data Validation**: Zod schemas validate all inputs
5. **Backup Strategy**: Regular backups ensure data preservation

### Future Enhancements (Phase 2 and Beyond)

1. **Recipe Ingredients**: Junction table for recipe formulations
2. **Supplier Management**: Enhanced supplier qualification system
3. **Cost Tracking**: Detailed cost analysis and reporting
4. **Yield Analysis**: Statistical analysis of production efficiency
5. **Predictive Maintenance**: Equipment performance tracking
6. **Mobile Integration**: Field data collection capabilities
7. **API Documentation**: OpenAPI/Swagger documentation
8. **Real-time Monitoring**: WebSocket integration for live updates
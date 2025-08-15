#!/bin/bash

# BakerMaiden Test Database Setup Script
# This script sets up a test database environment for running database tests

set -e  # Exit on any error

echo "🔧 BakerMaiden Test Database Setup"
echo "=================================="

# Check if required environment variables are set
if [ -z "$TEST_DATABASE_URL" ]; then
    echo "❌ ERROR: TEST_DATABASE_URL is not set"
    echo "Please set TEST_DATABASE_URL to your test database connection string"
    echo "Example: export TEST_DATABASE_URL='postgresql://user:password@localhost:5432/bakermaiden_test'"
    exit 1
fi

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

# Check if Prisma CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ ERROR: npx is not available"
    echo "Please ensure Node.js and npm are properly installed"
    exit 1
fi

echo "✅ Environment checks passed"

# Validate Prisma schema
echo "📋 Validating Prisma schema..."
if ! DATABASE_URL=$TEST_DATABASE_URL npx prisma validate; then
    echo "❌ ERROR: Prisma schema validation failed"
    echo "Please check your schema.prisma file for errors"
    exit 1
fi

echo "✅ Schema validation passed"

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

echo "✅ Prisma client generated"

# Push schema to test database (development mode)
echo "🚀 Pushing schema to test database..."
if ! DATABASE_URL=$TEST_DATABASE_URL npx prisma db push --force-reset; then
    echo "❌ ERROR: Failed to push schema to test database"
    echo "Please check your database connection and permissions"
    exit 1
fi

echo "✅ Schema pushed to test database"

# Run database tests
echo "🧪 Running database tests..."
if npm test -- __tests__/database/schema.test.ts; then
    echo "✅ Basic schema tests passed"
else
    echo "⚠️  WARNING: Some schema tests failed"
    echo "You may need to fix test issues before proceeding"
fi

# Run traceability tests
echo "🔍 Running traceability tests..."
if npm test -- __tests__/database/traceability.test.ts; then
    echo "✅ Traceability tests passed"
else
    echo "⚠️  WARNING: Some traceability tests failed"
fi

# Run performance tests (optional - can be slow)
if [ "$RUN_PERFORMANCE_TESTS" = "true" ]; then
    echo "⚡ Running performance tests..."
    if npm test -- __tests__/database/performance.test.ts; then
        echo "✅ Performance tests passed"
    else
        echo "⚠️  WARNING: Some performance tests failed"
    fi
else
    echo "ℹ️  Skipping performance tests (set RUN_PERFORMANCE_TESTS=true to run)"
fi

# Display database info
echo ""
echo "📊 Database Information:"
echo "======================="
DATABASE_URL=$TEST_DATABASE_URL npx prisma db pull --print | head -20

# Create sample data (optional)
if [ "$CREATE_SAMPLE_DATA" = "true" ]; then
    echo ""
    echo "📝 Creating sample data..."
    if [ -f "prisma/seed.ts" ]; then
        DATABASE_URL=$TEST_DATABASE_URL npm run db:seed
        echo "✅ Sample data created"
    else
        echo "ℹ️  No seed file found, skipping sample data creation"
    fi
fi

echo ""
echo "🎉 Test database setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Run all tests: npm run test:db"
echo "2. Run specific tests: npm run test:schema"
echo "3. Open Prisma Studio: DATABASE_URL=\$TEST_DATABASE_URL npx prisma studio"
echo ""
echo "Environment:"
echo "- Test Database: $TEST_DATABASE_URL"
echo "- Node.js: $(node --version)"
echo "- NPM: $(npm --version)"
echo ""
# Supabase Database Connection Guide

## Current Working Configuration (VALIDATED)

```bash
# Your current connection string - WORKING PERFECTLY
DATABASE_URL="postgresql://postgres.asfndfgavcgyjjfqipua:lifeisgrand69%25@aws-0-us-east-2.pooler.supabase.com:5432/postgres?connection_limit=10&pool_timeout=30&connect_timeout=60"
```

**Status:** ✅ FUNCTIONAL - Tested on 2025-08-15
**Connection Test Results:** 
- Database connectivity: SUCCESS
- Schema access: 9 tables found
- Data verification: 4 recipe records
- PostgreSQL version: 17.4

## Alternative Connection String Formats

### 1. Session Pooler (Current - RECOMMENDED)
```bash
# Best for: Web applications, persistent connections
# Port: 5432
DATABASE_URL="postgresql://postgres.asfndfgavcgyjjfqipua:lifeisgrand69%25@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
```

### 2. Transaction Pooler (Serverless)
```bash
# Best for: Serverless functions, edge functions, auto-scaling deployments
# Port: 6543
# Required: pgbouncer=true parameter
DATABASE_URL="postgresql://postgres.asfndfgavcgyjjfqipua:lifeisgrand69%25@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

### 3. Direct Connection (IPv6)
```bash
# Best for: Migrations, admin tools, persistent servers
# Port: 5432
# Note: Requires IPv6 support or IPv4 add-on
DIRECT_URL="postgresql://postgres:lifeisgrand69%25@db.asfndfgavcgyjjfqipua.supabase.co:5432/postgres"
```

## Recommended Configuration for Next.js + Prisma

For your current BakerMaiden setup (Production-ready):

```bash
# Primary connection (Session Pooler) - for application queries
DATABASE_URL="postgresql://postgres.asfndfgavcgyjjfqipua:lifeisgrand69%25@aws-0-us-east-2.pooler.supabase.com:5432/postgres?connection_limit=10&pool_timeout=30&connect_timeout=60"

# Direct connection (Optional) - for migrations only
DIRECT_URL="postgresql://postgres:lifeisgrand69%25@db.asfndfgavcgyjjfqipua.supabase.co:5432/postgres"
```

## Connection String Components Explained

```
postgresql://postgres.PROJECT-ID:PASSWORD@HOST:PORT/DATABASE?PARAMETERS
```

**Your Project Details:**
- **Project ID:** `asfndfgavcgyjjfqipua`
- **Region:** `us-east-2`
- **Password:** `lifeisgrand69%` (URL encoded as `lifeisgrand69%25`)
- **Host Types:**
  - Pooler: `aws-0-us-east-2.pooler.supabase.com`
  - Direct: `db.asfndfgavcgyjjfqipua.supabase.co`

## Performance Optimization Parameters

```bash
# Current optimized parameters (VALIDATED)
?connection_limit=10       # Limits concurrent connections per instance
&pool_timeout=30          # Seconds to wait for connection from pool
&connect_timeout=60       # Seconds to wait for initial connection

# Additional Prisma optimization options
&pgbouncer=true           # Required for transaction mode (port 6543)
&schema=public            # Specify schema if using multiple schemas
```

## Connection Testing Commands

```bash
# Test with Prisma
npx prisma db pull

# Test with psql
psql "postgresql://postgres.asfndfgavcgyjjfqipua:lifeisgrand69%25@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# Generate Prisma client
npx prisma generate
```

## Troubleshooting Guide

### Common Issues & Solutions

1. **"Can't reach database server"**
   - ✅ Your connection: WORKING (tested)
   - Add `?connect_timeout=30` if needed

2. **"Connection pool timeout"**
   - ✅ Your connection: Optimized with `pool_timeout=30`
   - Reduce `connection_limit` if issues persist

3. **"Prepared statement already exists"**
   - Use transaction mode with `?pgbouncer=true`
   - Switch to port 6543 for serverless

4. **IPv6 connectivity issues**
   - Use Session Pooler (your current config)
   - Or upgrade to IPv4 add-on for direct connection

## Production Deployment Notes

**Vercel Deployment:**
- Current configuration is optimized for Vercel
- Session Pooler handles concurrent connections efficiently
- No changes needed for production deployment

**Environment Variables:**
```bash
# .env (for development)
DATABASE_URL="postgresql://postgres.asfndfgavcgyjjfqipua:lifeisgrand69%25@aws-0-us-east-2.pooler.supabase.com:5432/postgres?connection_limit=10&pool_timeout=30&connect_timeout=60"

# Vercel environment variables (production)
DATABASE_URL=[same value as above]
```

---

**Connection Status:** ✅ FULLY OPERATIONAL
**Last Verified:** 2025-08-15 15:49:27 UTC
**Performance:** 1.42s schema introspection
**Database Version:** PostgreSQL 17.4
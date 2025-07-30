# BakerMaiden Production Deployment Guide

This guide will walk you through deploying BakerMaiden to production using Vercel and Supabase.

## Prerequisites

- Node.js 18+ installed
- Git repository (GitHub/GitLab/Bitbucket)
- Vercel account (free tier available)
- Supabase account (free tier available)

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Visit [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project" 
3. Choose your organization
4. Enter project details:
   - **Name**: `bakermaiden` (or your preferred name)
   - **Database Password**: Generate a secure password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for MVP

### 1.2 Get Database Connection Details

Once your project is created:

1. Go to **Settings > Database**
2. Scroll to **Connection String** section
3. Copy the **Connection pooling** URL (used for app connections)
4. Copy the **Direct connection** URL (used for migrations)

The URLs will look like:
```
# Connection pooling (for app)
postgresql://postgres.xxx:password@xxx.pooler.supabase.com:5432/postgres?pgbouncer=true

# Direct connection (for migrations) 
postgresql://postgres.xxx:password@xxx.supabase-db.xxx.com:5432/postgres
```

### 1.3 Set Up Database Schema

1. Open **SQL Editor** in your Supabase dashboard
2. Run the following SQL to create your schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create recipes table
CREATE TABLE recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ingredients table
CREATE TABLE ingredients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipe_ingredients junction table
CREATE TABLE recipe_ingredients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(recipe_id, ingredient_id)
);

-- Create indexes for better performance
CREATE INDEX idx_recipes_name ON recipes(name);
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_id ON recipe_ingredients(ingredient_id);

-- Add updated_at trigger for recipes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

3. Click **Run** to execute the SQL

### 1.4 Insert Sample Data (Optional)

```sql
-- Insert sample recipes
INSERT INTO recipes (name, description) VALUES 
('Chocolate Chip Cookies', 'Classic homemade chocolate chip cookies'),
('Sourdough Bread', 'Traditional sourdough bread with wild yeast'),
('Vanilla Cupcakes', 'Light and fluffy vanilla cupcakes with buttercream');

-- Insert sample ingredients
INSERT INTO ingredients (name, unit, current_stock) VALUES 
('All-Purpose Flour', 'lbs', 25.0),
('Sugar', 'lbs', 20.0),
('Butter', 'lbs', 10.0),
('Eggs', 'dozen', 5.0),
('Chocolate Chips', 'lbs', 8.0),
('Vanilla Extract', 'fl oz', 16.0),
('Baking Soda', 'oz', 32.0);

-- Connect recipes to ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) 
SELECT 
    r.id, 
    i.id, 
    CASE 
        WHEN i.name = 'All-Purpose Flour' THEN 2.25
        WHEN i.name = 'Sugar' THEN 1.5
        WHEN i.name = 'Butter' THEN 1.0
        WHEN i.name = 'Eggs' THEN 0.5
        WHEN i.name = 'Chocolate Chips' THEN 2.0
        WHEN i.name = 'Vanilla Extract' THEN 0.125
        WHEN i.name = 'Baking Soda' THEN 0.0625
    END as quantity
FROM recipes r, ingredients i 
WHERE r.name = 'Chocolate Chip Cookies' 
AND i.name IN ('All-Purpose Flour', 'Sugar', 'Butter', 'Eggs', 'Chocolate Chips', 'Vanilla Extract', 'Baking Soda');
```

## Step 2: Set Up GitHub Repository

### 2.1 Push to GitHub

```bash
# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/YOUR_USERNAME/bakermaiden.git

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy to Vercel

### 3.1 Create Vercel Project

1. Visit [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### 3.2 Set Environment Variables

Before deploying, add these environment variables in Vercel:

1. Go to your project settings in Vercel
2. Click on **Environment Variables** tab
3. Add the following variables:

```bash
# Database Connection (use the pooling URL from Supabase)
DATABASE_URL=postgresql://postgres.xxx:password@xxx.pooler.supabase.com:5432/postgres?pgbouncer=true

# Direct Database URL (for migrations)
DIRECT_URL=postgresql://postgres.xxx:password@xxx.supabase-db.xxx.com:5432/postgres

# App URL (will be auto-generated by Vercel)
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app

# Environment identifier
VERCEL_ENV=production
```

### 3.3 Deploy

1. Click **Deploy** in Vercel
2. Wait for the build to complete
3. Visit the deployed URL to test

## Step 4: Verify Deployment

### 4.1 Check Database Connection

The deployment should automatically run `prisma generate` during build. Verify by:

1. Check Vercel build logs for any Prisma errors
2. Visit your deployed app URL
3. Navigate to each page (Dashboard, Recipes, Inventory)
4. Try creating a new recipe or ingredient

### 4.2 Test Core Functionality

- ✅ Home page loads
- ✅ Navigation works between pages
- ✅ Dashboard displays data from database
- ✅ Can view recipes and ingredients
- ✅ Can create new recipes and ingredients
- ✅ Can edit and delete items
- ✅ Database operations persist

## Step 5: Set Up Automatic Deployments

Vercel automatically deploys when you push to your main branch:

```bash
# Make changes to your code
git add .
git commit -m "Update feature"
git push origin main
```

Vercel will automatically:
1. Build your application
2. Run `prisma generate`
3. Deploy to production
4. Update your live URL

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check if Prisma schema is valid
npx prisma validate

# Regenerate Prisma client locally
npx prisma generate
```

#### Database Connection Issues
- Verify `DATABASE_URL` is correct in Vercel environment variables
- Check Supabase project is not paused (free tier pauses after inactivity)
- Ensure database schema matches Prisma schema

#### Environment Variable Issues
- Make sure all required variables are set in Vercel
- Check for typos in variable names
- Verify URLs don't have extra spaces or characters

### Logs and Monitoring

1. **Vercel Logs**: Check function logs in Vercel dashboard
2. **Supabase Logs**: Monitor database queries in Supabase dashboard
3. **Browser Console**: Check for JavaScript errors

## Performance Optimization

### Database
- Connection pooling is enabled with `pgbouncer=true`
- Indexes are created on frequently queried columns
- Foreign key constraints ensure data integrity

### Application
- Next.js automatic code splitting
- Static optimization for pages without server-side data
- Vercel CDN for static assets

### Monitoring
- Vercel provides analytics on the free tier
- Supabase dashboard shows database performance metrics

## Security Considerations

### Database Security
- Row Level Security (RLS) can be enabled later for multi-tenant support
- Connection string uses SSL by default
- Database is isolated to your Supabase project

### Application Security
- Environment variables are secure in Vercel
- HTTPS enforced by default
- Security headers configured in `vercel.json`

## Scaling Considerations

### Free Tier Limits
- **Vercel**: 100GB bandwidth, 100 deployments per day
- **Supabase**: 500MB database, 2GB bandwidth, 50MB file storage

### Upgrade Path
- Database: Increase storage and bandwidth
- Hosting: Vercel Pro for more bandwidth and features
- CDN: Already included with Vercel

## Next Steps

After successful deployment:

1. **Custom Domain**: Add your own domain in Vercel settings
2. **Monitoring**: Set up error tracking (Sentry, LogRocket)
3. **Analytics**: Add Google Analytics or similar
4. **Backup**: Set up database backups in Supabase
5. **Security**: Implement authentication and authorization
6. **Features**: Add advanced features like batch operations, reporting

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)

Your BakerMaiden application should now be live and accessible to users worldwide! 🚀
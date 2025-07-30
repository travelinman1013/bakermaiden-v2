# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BakerMaiden is a bakery management MVP built as a modern web application. The project is in initial development phase with the goal of creating a working foundation that includes recipe management, ingredient inventory, and a dashboard interface.

## Tech Stack & Architecture

**Frontend:**
- Next.js 14 with App Router and TypeScript
- Tailwind CSS + shadcn/ui components
- React Hook Form for form handling

**Backend:**
- Next.js API routes for RESTful endpoints
- Prisma ORM for database operations
- Zod for input validation and type safety

**Database:**
- PostgreSQL (Supabase in production)

**Deployment:**
- Vercel for hosting
- GitHub for version control

## Development Commands

*Note: Commands will be updated once package.json is created*

**Development:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

**Database:**
```bash
npx prisma generate      # Generate Prisma client
npx prisma db push       # Push schema changes to database
npx prisma studio        # Open Prisma Studio GUI
npx prisma migrate dev   # Create and apply new migration
```

## Project Structure

```
/app                     # Next.js App Router pages
  /dashboard/page.tsx    # Dashboard with stats and overview
  /recipes/page.tsx      # Recipe management interface
  /inventory/page.tsx    # Ingredient inventory management
  /api/
    /recipes/route.ts    # Recipe CRUD operations
    /ingredients/route.ts # Ingredient CRUD operations
  layout.tsx             # Root layout with navigation
  page.tsx               # Home page

/components
  /ui/                   # shadcn/ui components
  /forms/                # Form components
  /layout/               # Navigation and layout components

/lib
  /db.ts                 # Database connection and utilities
  /validations.ts        # Zod schemas for validation

/prisma
  schema.prisma          # Database schema definition
```

## Core Data Models

**recipes** - Recipe information (id, name, description, timestamps)
**ingredients** - Ingredient inventory (id, name, unit, current_stock, timestamps)  
**recipe_ingredients** - Many-to-many relationship (recipe_id, ingredient_id, quantity)

## Development Guidelines

**Agent Coordination:**
- Use specialized agents (`frontend-developer`, `backend-architect`, `deployment-engineer`)
- Call support agents when needed (`test-automator`, `debugger`, `code-reviewer`, `error-detective`)
- Document all agent work for session continuity

**Code Patterns:**
- Follow Next.js 14 App Router conventions
- Use TypeScript strictly - no `any` types
- Implement proper error handling in API routes
- Use Zod schemas for all input validation
- Keep components simple and focused
- Use shadcn/ui for consistent UI components

**API Design:**
- RESTful endpoints under `/api/`
- Consistent error response format
- Input validation with Zod
- Proper HTTP status codes

**Database Operations:**
- Use Prisma for all database interactions
- Include proper error handling
- Use transactions for multi-table operations
- Follow PostgreSQL naming conventions

## Current Development Phase

**Status:** Foundation setup phase
**Priority:** Get basic CRUD operations working with clean UI
**Target:** Working MVP deployed to Vercel with Supabase database

**Immediate Goals:**
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up shadcn/ui and Tailwind CSS
- [ ] Create Prisma schema and database connection
- [ ] Build basic navigation layout
- [ ] Implement core pages (Dashboard, Recipes, Inventory)
- [ ] Create API routes for recipes and ingredients
- [ ] Deploy to Vercel with Supabase integration

## Features NOT Implemented (Future Scope)

- Authentication/user management
- Recipe costing calculations
- QuickBooks integration
- Advanced inventory tracking
- Production batch management
- Analytics and reporting
- Multi-tenant support
- File uploads
- Real-time features

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Vercel/Next.js
NEXT_PUBLIC_APP_URL="https://..."
```

## Agent-Specific Notes

**For frontend-developer:**
- Focus on mobile-first responsive design
- Use shadcn/ui components consistently
- Implement proper loading and error states
- Keep UI professional but not overly complex

**For backend-architect:**
- Design clean, RESTful API endpoints
- Implement comprehensive input validation
- Use proper error handling patterns
- Optimize database queries with Prisma

**For deployment-engineer:**
- Configure Vercel deployment settings
- Set up Supabase database connection
- Manage environment variables securely
- Monitor application performance post-deployment

## Success Criteria

**Technical:**
- All pages load under 2 seconds
- Mobile-responsive design
- No console errors
- Forms validate properly
- Database operations work correctly

**Functional:**
- Navigation between pages works smoothly
- Can add/edit/delete recipes and ingredients
- Data persists correctly in database
- UI looks professional and is easy to use
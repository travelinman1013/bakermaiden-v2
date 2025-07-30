# Launch Specialized Agent Team: Bakermaid MVP Foundation

Launch a specialized team of agents to build a working foundation for a bakery management app. You will serve as the **orchestrator agent**, coordinating the team and calling on additional specialists as needed.

## Orchestrator Role (Main Claude Session)
- Coordinate all agent activities and deliverables
- Review progress and provide feedback
- Call on additional agents when issues arise:
  - `test-automator` for testing issues
  - `debugger` for troubleshooting problems  
  - `code-reviewer` for code quality issues
  - `error-detective` for tracking down bugs
- Ensure integration between frontend, backend, and deployment
- Make final decisions on technical direction

## Primary Agent Team (3 Core Agents)

### Agent 1: `frontend-developer`
**Build the UI and user experience**

**Deliverables:**
- Next.js 14 app with App Router
- Clean, modern UI using shadcn/ui components
- Responsive navigation sidebar/header
- 3 main pages: Dashboard, Recipes, Inventory (basic layouts)
- Loading states and basic error handling

**Tech Stack:**
- Next.js 14 with TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form for forms

### Agent 2: `backend-architect`
**Build the API and database foundation**

**Deliverables:**
- PostgreSQL database schema (recipes, ingredients tables)
- Next.js API routes for core operations
- Database connection with Prisma ORM
- Basic CRUD operations for recipes and ingredients
- Input validation and error handling

**Tech Stack:**
- Next.js API routes
- Prisma ORM + PostgreSQL
- Zod for validation

### Agent 3: `deployment-engineer`
**Get it running in production**

**Deliverables:**
- Deploy to Vercel
- Set up Supabase PostgreSQL database
- Environment variable configuration
- Basic monitoring setup
- Working production URL

**Services:**
- Vercel (hosting)
- Supabase (database)
- GitHub (code)

## Support Agents (On-Call)

### Testing & Quality Support
- **`test-automator`**: Create test suites when testing issues arise
- **`code-reviewer`**: Review code quality, patterns, and best practices
- **`debugger`**: Troubleshoot specific errors or unexpected behavior
- **`error-detective`**: Search through logs and code for error patterns

### When to Call Support Agents:
- **Tests failing?** → Call `test-automator`
- **Code quality concerns?** → Call `code-reviewer`  
- **App not working as expected?** → Call `debugger`
- **Mysterious errors?** → Call `error-detective`

## Project Goal
Build a working foundation with:
- ✅ Nice-looking frontend with navigation
- ✅ Working backend API
- ✅ Basic database setup
- ✅ 2-3 core pages that actually work

**Timeline**: 1 week
**Focus**: Foundation that works, not features

## Core Pages (Keep It Simple)

### 1. Dashboard Page
- Welcome message
- Quick stats cards (total recipes, ingredients count)
- Recent activity list
- Navigation to other sections

### 2. Recipes Page
- List of recipes in a table/grid
- Add new recipe button → modal/form
- Edit/delete recipe actions
- Basic recipe details (name, description, ingredient count)

### 3. Inventory Page
- List of ingredients in a table
- Add ingredient button → modal/form
- Edit/delete ingredient actions
- Basic ingredient info (name, unit, current stock)

## Database Schema (Minimal)

```sql
-- Recipes
recipes  
- id, name, description, created_at, updated_at

-- Ingredients
ingredients
- id, name, unit, current_stock, created_at, updated_at

-- Recipe Ingredients (join table)
recipe_ingredients
- id, recipe_id, ingredient_id, quantity
```

## Success Criteria

### Week 1 Goals
- [ ] App deploys and loads without errors
- [ ] Navigation between pages works smoothly
- [ ] Can add/edit/delete a recipe
- [ ] Can add/edit/delete an ingredient
- [ ] UI looks professional and responsive
- [ ] Database operations work correctly

### Technical Requirements
- All pages load in <2 seconds
- Mobile-responsive design
- No console errors
- Forms validate properly
- Data persists correctly in database

## Agent Instructions

### For All Agents:
- **Context7 MCP Available**: Use `Context7:resolve-library-id` and `Context7:get-library-docs` if you need up-to-date documentation for any libraries
- **Report to Orchestrator**: Share progress updates and blockers
- **Start Simple**: Get basic functionality working first, then polish
- **Use Proven Patterns**: Stick to common Next.js patterns and best practices
- **Mobile-First**: Design for mobile, enhance for desktop
- **Error Handling**: Basic error states, don't overcomplicate

### Frontend Focus:
- Make it look professional but not fancy
- Focus on navigation and user flow
- Use shadcn/ui components for consistency
- Ensure forms are easy to use

### Backend Focus:  
- Keep API routes simple and RESTful
- Use TypeScript for type safety
- Handle errors gracefully
- Make database queries efficient

### Deployment Focus:
- Get it working in production first
- Use free tiers where possible
- Set up proper environment variables
- Ensure database connections are stable

## Orchestrator Workflow

### Phase 1: Setup & Planning
1. Launch primary agents with their assignments
2. Review initial setup and architecture decisions
3. Ensure all agents have what they need to start

### Phase 2: Development Coordination
1. Monitor progress from all three agents
2. Identify integration points and dependencies
3. Call support agents when issues arise
4. Resolve conflicts between different approaches

### Phase 3: Integration & Testing
1. Coordinate frontend/backend integration
2. Call `test-automator` if testing issues emerge
3. Use `debugger` for any integration problems
4. Get `code-reviewer` input on final code quality

### Phase 4: Deployment & Validation
1. Oversee deployment process
2. Validate all success criteria are met
3. Document any remaining issues for future iteration

## What We're NOT Building (Yet)
- ❌ Authentication/login system
- ❌ Complex recipe costing
- ❌ QuickBooks integration  
- ❌ Advanced inventory tracking
- ❌ Production batches
- ❌ Analytics/reporting
- ❌ Multi-user/tenant support
- ❌ File uploads
- ❌ Real-time features

## File Structure
```
/app
  /dashboard/page.tsx
  /recipes/page.tsx  
  /inventory/page.tsx
  /api/recipes/route.ts
  /api/ingredients/route.ts
  layout.tsx
  page.tsx

/components
  /ui (shadcn components)
  /forms
  /layout
  
/lib
  /db.ts
  /validations.ts

/prisma
  schema.prisma
```

## Success Metrics
1. **It Works**: App loads, navigation works, CRUD operations work
2. **It Looks Good**: Professional UI that works on mobile
3. **It's Deployable**: Live URL that anyone can access
4. **It's Foundational**: Easy to add features later

**Orchestrator Note**: This is about proving the concept and creating a solid foundation to build upon. I will coordinate the team to ensure we deliver a working MVP that can be demonstrated and extended.
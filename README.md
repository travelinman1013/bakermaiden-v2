# BakerMaiden

A modern bakery management MVP built with Next.js 14, TypeScript, Prisma, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (Supabase recommended)

### Local Development

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd bakermaiden
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
# Edit .env.local with your database credentials
```

3. **Set up the database:**
```bash
npm run db:push
npm run db:generate
```

4. **Start development server:**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your application.

## 📦 Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in Vercel dashboard
   - Deploy automatically

3. **Set up database:**
   - Create Supabase project
   - Copy connection string to Vercel environment variables
   - Run database migrations

### Environment Variables

Required environment variables for production:

```bash
# Database Connection (Supabase)
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]?pgbouncer=true"

# Optional: Direct connection for migrations
DIRECT_URL="postgresql://[user]:[password]@[host]:[port]/[database]"

# Application URL
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

## 🏗️ Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Deployment:** Vercel
- **Validation:** Zod

## 📊 Database Schema

- **recipes** - Recipe information (name, description)
- **ingredients** - Ingredient inventory (name, unit, stock)
- **recipe_ingredients** - Many-to-many relationship (recipes ↔ ingredients)

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:migrate   # Create and run migrations  
npm run db:deploy    # Deploy migrations to production
npm run db:studio    # Open Prisma Studio GUI
```

## 🔧 Development

### Project Structure
```
/app                 # Next.js App Router pages
  /dashboard/        # Dashboard page
  /recipes/          # Recipe management
  /inventory/        # Ingredient inventory
  /api/              # API routes
/components          # React components
  /ui/               # shadcn/ui components
/lib                 # Utilities and database
/prisma              # Database schema and migrations
```

### Adding New Features
1. Update database schema in `prisma/schema.prisma`
2. Run `npm run db:push` to update database
3. Create API routes in `/app/api/`
4. Build UI components in `/components/`
5. Create pages in `/app/`

## 🚨 Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check database is accessible
- Ensure Prisma client is generated

### Build Failures
- Run `npm run type-check` to find TypeScript errors
- Verify all environment variables are set
- Check build logs for specific errors

### Deployment Issues  
- Verify environment variables in Vercel dashboard
- Check build and function logs in Vercel
- Ensure database migrations are deployed

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and type checking
5. Submit a pull request

## 📄 License

This project is private and proprietary.
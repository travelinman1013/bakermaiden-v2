Excellent. Analyzing the existing repository is the perfect next step. This allows for hyper-specific instructions that leave no room for ambiguity. I have analyzed the repository structure and code style.

The following plan is a detailed, step-by-step guide to transform your existing `bakermaiden` application into the focused MVP. It is designed to be executed sequentially by a single AI developer agent. Each step provides the exact file path, the code to be inserted, and the terminal commands to run.

---

### **Prompt for AI Developer Agent: BakerMaid MVP Transformation**

**Your Mission:** Your sole mission is to transform an existing Next.js application into a targeted MVP for a bakery. You will follow these instructions precisely and sequentially. You will not deviate or add any features not listed here. The goal is to pivot from a generic recipe app to a specific production tracking tool.

**Guiding Principles:**
*   **Simplicity:** We will only build what is absolutely necessary.
*   **Server Actions:** All database mutations will be handled by Next.js Server Actions. You will not build separate API routes.
*   **Single-Agent Workflow:** You will complete each Part in order before moving to the next.

**Prerequisites (Confirm before starting):**
1.  The repository is cloned.
2.  `npm install` has been run.
3.  The `.env.local` file is created and contains a valid `DATABASE_URL` for your Supabase project.

---

### **Part 1: Database and Seeding**

**Objective:** Overhaul the database schema to match the MVP requirements and seed it with initial data so the application is testable.

1.  **Modify the Schema:**
    *   Navigate to the file: `prisma/schema.prisma`.
    *   **DELETE** all existing `model` definitions (`Recipe`, `Ingredient`, `RecipeIngredient`).
    *   **REPLACE** the entire file content with this new schema:

    ```prisma
    // File: prisma/schema.prisma

    generator client {
      provider = "prisma-client-js"
    }

    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }

    model Recipe {
      id             Int              @id @default(autoincrement())
      name           String           @unique
      productionRuns ProductionRun[]
    }

    model ProductionRun {
      id        Int      @id @default(autoincrement())
      createdAt DateTime @default(now())
      dailyLot  String
      cakeLot   String
      icingLot  String
      recipeId  Int
      recipe    Recipe   @relation(fields: [recipeId], references: [id])
      pallets   Pallet[]
    }

    model Pallet {
      id              Int           @id @default(autoincrement())
      createdAt       DateTime      @default(now())
      productionRunId Int
      productionRun   ProductionRun @relation(fields: [productionRunId], references: [id], onDelete: Cascade)
    }
    ```

2.  **Apply Schema to Database:**
    *   Open your terminal.
    *   Run the command: `npm run db:push`.
    *   Wait for it to complete successfully.

3.  **Create a Seed Script:**
    *   Create a new file: `prisma/seed.ts`.
    *   Populate it with this code to create initial recipes:

    ```typescript
    // File: prisma/seed.ts

    import { PrismaClient } from '@prisma/client';
    const prisma = new PrismaClient();

    async function main() {
      console.log('Start seeding...');
      await prisma.recipe.deleteMany(); // Clear existing recipes
      await prisma.recipe.create({
        data: { name: 'HEB Vanilla Quarter Birthday' },
      });
      await prisma.recipe.create({
        data: { name: 'HEB Vanilla Eighth Ash Blue' },
      });
      await prisma.recipe.create({
        data: { name: 'Almond Cupcake' },
      });
      console.log('Seeding finished.');
    }

    main()
      .catch((e) => {
        console.error(e);
        process.exit(1);
      })
      .finally(async () => {
        await prisma.$disconnect();
      });
    ```

4.  **Add the Seed Command:**
    *   Open the file: `package.json`.
    *   Inside the `"scripts"` object, add this new line:
        `"db:seed": "ts-node --compiler-options {\\\"module\\\":\\\"commonjs\\\"} prisma/seed.ts"`

5.  **Run the Seed Script:**
    *   In your terminal, run: `npm run db:seed`.
    *   Confirm you see the "Seeding finished" message.

---

### **Part 2: UI Layout and Navigation**

**Objective:** Update the main navigation to reflect the MVP's focused functionality.

1.  **Modify the Header:**
    *   Navigate to the file: `components/header.tsx`.
    *   Locate the `<NavigationMenuList>` component.
    *   **DELETE** the `NavigationMenuItem` for "Inventory".
    *   **ADD** a new `NavigationMenuItem` for "Production".
    *   The final list should look like this:

    ```tsx
    // Inside components/header.tsx
    <NavigationMenuList>
      <NavigationMenuItem>
        <Link href="/dashboard" legacyBehavior passHref>
          <NavigationMenuLink className={navigationMenuTriggerStyle()}>
            Dashboard
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/recipes" legacyBehavior passHref>
          <NavigationMenuLink className={navigationMenuTriggerStyle()}>
            Recipes
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <Link href="/production" legacyBehavior passHref>
          <NavigationMenuLink className={navigationMenuTriggerStyle()}>
            Production
          </NavigationMenuLink>
        </Link>
      </NavigationMenuItem>
    </NavigationMenuList>
    ```

2.  **Clean up old Inventory page:**
    *   Delete the entire directory: `app/inventory`.

---

### **Part 3: Build the Production Page**

**Objective:** Create the main page for supervisors to manage production runs.

1.  **Create Server Actions File:**
    *   Create a new file: `app/production/actions.ts`.
    *   Add this code. It defines the logic for starting a production run.

    ```typescript
    // File: app/production/actions.ts
    'use server';

    import { z } from 'zod';
    import { revalidatePath } from 'next/cache';
    import { redirect } from 'next/navigation';
    import { prisma } from '@/lib/db';

    const RunSchema = z.object({
      recipeId: z.coerce.number().min(1, 'Please select a recipe.'),
      dailyLot: z.string().min(1, 'Daily lot is required.'),
      cakeLot: z.string().min(1, 'Cake lot is required.'),
      icingLot: z.string().min(1, 'Icing lot is required.'),
    });

    export async function startProductionRun(formData: FormData) {
      const validatedFields = RunSchema.safeParse(Object.fromEntries(formData.entries()));

      if (!validatedFields.success) {
        console.error(validatedFields.error);
        return; // Handle errors appropriately in a real app
      }

      await prisma.productionRun.create({
        data: validatedFields.data,
      });

      revalidatePath('/production');
    }
    ```

2.  **Create the Production Page:**
    *   Create a new file: `app/production/page.tsx`.
    *   Add this code. This is the main server component that fetches data and displays the form.

    ```typescript
    // File: app/production/page.tsx
    import Link from 'next/link';
    import { prisma } from '@/lib/db';
    import { startProductionRun } from './actions';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import {
      Card,
      CardContent,
      CardHeader,
      CardTitle,
      CardDescription,
    } from '@/components/ui/card';
    import {
      Select,
      SelectContent,
      SelectItem,
      SelectTrigger,
      SelectValue,
    } from '@/components/ui/select';

    export default async function ProductionPage() {
      const recipes = await prisma.recipe.findMany();
      const runs = await prisma.productionRun.findMany({
        orderBy: { createdAt: 'desc' },
        include: { recipe: true, _count: { select: { pallets: true } } },
      });

      return (
        <div className="container mx-auto p-4 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Start New Production Run</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={startProductionRun} className="space-y-4 max-w-lg">
                <div>
                  <Label htmlFor="recipeId">Recipe</Label>
                  <Select name="recipeId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={String(recipe.id)}>
                          {recipe.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dailyLot">Daily Lot #</Label>
                  <Input name="dailyLot" placeholder="e.g., 5175" />
                </div>
                <div>
                  <Label htmlFor="cakeLot">Cake Lot #</Label>
                  <Input name="cakeLot" placeholder="e.g., 5174M" />
                </div>
                <div>
                  <Label htmlFor="icingLot">Icing Lot #</Label>
                  <Input name="icingLot" placeholder="e.g., 5175" />
                </div>
                <Button type="submit">Start Run</Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-2xl font-bold mb-4">Active and Recent Runs</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {runs.map((run) => (
                <Link href={`/production/${run.id}`} key={run.id}>
                  <Card className="hover:bg-muted/50">
                    <CardHeader>
                      <CardTitle>{run.recipe.name}</CardTitle>
                      <CardDescription>Daily Lot: {run.dailyLot}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>Cake Lot: {run.cakeLot}</p>
                      <p>Icing Lot: {run.icingLot}</p>
                      <p className="mt-4 text-lg font-bold">
                        Pallets Produced: {run._count.pallets}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      );
    }
    ```

---

### **Part 4: Build the Pallet Entry Page**

**Objective:** Create the dynamic page for a specific run where floor workers can add pallets.

1.  **Create Server Actions File:**
    *   Create a new file: `app/production/[runId]/actions.ts`.
    *   Add this code. It defines the logic for adding a pallet.

    ```typescript
    // File: app/production/[runId]/actions.ts
    'use server';

    import { revalidatePath } from 'next/cache';
    import { prisma } from '@/lib/db';

    export async function addPalletToRun(runId: number) {
      await prisma.pallet.create({
        data: {
          productionRunId: runId,
        },
      });
      revalidatePath(`/production/${runId}`);
    }
    ```

2.  **Create the Dynamic Pallet Page:**
    *   Create a new file: `app/production/[runId]/page.tsx`.
    *   Add this code. This is the simple interface for a floor worker.

    ```typescript
    // File: app/production/[runId]/page.tsx
    import { notFound } from 'next/navigation';
    import { prisma } from '@/lib/db';
    import { addPalletToRun } from './actions';
    import { Button } from '@/components/ui/button';
    import {
      Card,
      CardContent,
      CardDescription,
      CardHeader,
      CardTitle,
    } from '@/components/ui/card';

    export default async function RunDetailsPage({
      params,
    }: {
      params: { runId: string };
    }) {
      const runId = parseInt(params.runId, 10);
      const run = await prisma.productionRun.findUnique({
        where: { id: runId },
        include: {
          recipe: true,
          _count: { select: { pallets: true } },
        },
      });

      if (!run) {
        notFound();
      }

      // Bind the action with the current runId
      const addPalletAction = addPalletToRun.bind(null, run.id);

      return (
        <div className="container mx-auto p-4">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">{run.recipe.name}</CardTitle>
              <CardDescription>Daily Lot: {run.dailyLot}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-lg">
                <p>
                  <span className="font-semibold">Cake Lot:</span> {run.cakeLot}
                </p>
                <p>
                  <span className="font-semibold">Icing Lot:</span> {run.icingLot}
                </p>
              </div>
              <div className="p-6 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Pallets Produced</p>
                <p className="text-6xl font-bold">{run._count.pallets}</p>
              </div>
              <form action={addPalletAction}>
                <Button size="lg" className="w-full h-16 text-xl">
                  Add One Pallet
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      );
    }
    ```

### **Final Step: Verification**

1.  Run the application with `npm run dev`.
2.  Go to the "Production" page.
3.  Fill out the form to start a new run. The new run should appear in the list below.
4.  Click on the new run.
5.  You should be on the detail page. Click the "Add One Pallet" button multiple times.
6.  The "Pallets Produced" count should update with each click.

Your mission is complete. You have successfully transformed the application into the specified MVP.
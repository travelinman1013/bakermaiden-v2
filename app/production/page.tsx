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
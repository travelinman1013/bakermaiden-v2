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
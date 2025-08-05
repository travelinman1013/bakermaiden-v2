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
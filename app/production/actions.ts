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
  const data = {
    recipeId: formData.get('recipeId'),
    dailyLot: formData.get('dailyLot'),
    cakeLot: formData.get('cakeLot'),
    icingLot: formData.get('icingLot'),
  };

  const validatedFields = RunSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error(validatedFields.error);
    return; // Handle errors appropriately in a real app
  }

  await prisma.productionRun.create({
    data: validatedFields.data,
  });

  revalidatePath('/production');
}
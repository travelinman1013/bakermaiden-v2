"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createProductionRunSchema } from '@/lib/validations';

interface Recipe {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

interface Ingredient {
  id: number;
  name: string;
  storageType: string;
  currentStock: number;
  allergens: string[];
}

interface IngredientLot {
  id: number;
  internalLotCode: string;
  quantityRemaining: number;
  supplierName: string;
  expirationDate: string;
  qualityStatus: string;
  ingredient: Ingredient;
}

interface ProductionRunFormProps {
  recipes: Recipe[];
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ProductionRunForm({ 
  recipes, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: ProductionRunFormProps) {
  const [availableIngredientLots, setAvailableIngredientLots] = useState<IngredientLot[]>([]);
  const [selectedLots, setSelectedLots] = useState<{ ingredientId: number; lotId: number; quantity: number }[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof createProductionRunSchema>>({
    resolver: zodResolver(createProductionRunSchema),
    defaultValues: {
      dailyLot: `DL-${Date.now()}`,
      cakeLot: '',
      icingLot: '',
      plannedQuantity: 100,
      recipeId: 0,
      primaryOperatorId: null,
      assistantOperatorId: null,
      inspectorId: null,
      equipmentStation: '',
      notes: '',
      startTime: new Date().toISOString(),
    },
  });

  // Fetch available ingredient lots when component mounts
  useEffect(() => {
    const fetchIngredientLots = async () => {
      setLoadingLots(true);
      try {
        const response = await fetch('/api/ingredient-lots?status=passed');
        if (!response.ok) {
          throw new Error('Failed to fetch ingredient lots');
        }
        const data = await response.json();
        setAvailableIngredientLots(data.data || []);
      } catch (error) {
        console.error('Error fetching ingredient lots:', error);
        setError('Failed to load ingredient lots. Please refresh and try again.');
      } finally {
        setLoadingLots(false);
      }
    };

    fetchIngredientLots();
  }, []);

  const handleSubmit = async (values: z.infer<typeof createProductionRunSchema>) => {
    try {
      setError(null);
      
      // Add selected ingredient lots to the submission
      const submissionData = {
        ...values,
        ingredientLots: selectedLots,
      };
      
      await onSubmit(submissionData);
      form.reset();
      setSelectedLots([]);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to create production run. Please try again.');
    }
  };

  const addIngredientLot = (ingredientId: number, lotId: number, quantity: number) => {
    if (selectedLots.find(lot => lot.lotId === lotId)) {
      return; // Already selected
    }
    setSelectedLots([...selectedLots, { ingredientId, lotId, quantity }]);
  };

  const removeIngredientLot = (lotId: number) => {
    setSelectedLots(selectedLots.filter(lot => lot.lotId !== lotId));
  };

  const getSelectedLot = (lotId: number) => {
    return availableIngredientLots.find(lot => lot.id === lotId);
  };

  const staffOptions = [
    'John Smith',
    'Jane Doe', 
    'Mike Johnson',
    'Sarah Wilson',
    'David Brown',
    'Lisa Anderson'
  ];

  const shiftOptions = ['Day', 'Evening', 'Night'];
  const productionLines = ['Line A', 'Line B', 'Line C', 'Packaging Line'];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Start New Production Run</CardTitle>
        <CardDescription>
          Create a new production run with full lot traceability
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="recipeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || '')}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a recipe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recipes.filter(r => r.isActive).map((recipe) => (
                          <SelectItem key={recipe.id} value={String(recipe.id)}>
                            {recipe.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="plannedQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Quantity *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of units to produce
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Lot Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="dailyLot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Lot *</FormLabel>
                    <FormControl>
                      <Input placeholder="DL-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cakeLot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cake Lot *</FormLabel>
                    <FormControl>
                      <Input placeholder="CL-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icingLot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icing Lot *</FormLabel>
                    <FormControl>
                      <Input placeholder="IL-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Production Details - Moved planned quantity to basic info section */}

            {/* Staff Assignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="primaryOperatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Operator</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} value={field.value?.toString() || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select primary operator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffOptions.map((staff) => (
                          <SelectItem key={staff} value={staff}>
                            {staff}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assistantOperatorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assistant Operator</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} value={field.value?.toString() || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assistant operator" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staffOptions.map((staff) => (
                          <SelectItem key={staff} value={staff}>
                            {staff}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Equipment and Shift */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="equipmentStation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Line</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select production line" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productionLines.map((line) => (
                          <SelectItem key={line} value={line}>
                            {line}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Shift field not implemented in current schema */}
            </div>

            {/* Ingredient Lot Selection */}
            <div className="space-y-4">
              <FormLabel>Selected Ingredient Lots</FormLabel>
              {loadingLots ? (
                <div className="text-sm text-muted-foreground">Loading ingredient lots...</div>
              ) : (
                <div className="space-y-4">
                  {selectedLots.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                      No ingredient lots selected. You can add them after creating the production run.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedLots.map((selectedLot) => {
                        const lot = getSelectedLot(selectedLot.lotId);
                        if (!lot) return null;
                        return (
                          <div key={selectedLot.lotId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{lot.ingredient.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Lot: {lot.internalLotCode} | Supplier: {lot.supplierName} | 
                                Available: {lot.quantityRemaining}
                              </div>
                              <div className="flex gap-2 mt-1">
                                <Badge variant={lot.qualityStatus === 'passed' ? 'default' : 'secondary'}>
                                  {lot.qualityStatus}
                                </Badge>
                                {lot.ingredient.allergens.map(allergen => (
                                  <Badge key={allergen} variant="outline" className="text-xs">
                                    {allergen}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0.1"
                                step="0.1"
                                max={lot.quantityRemaining}
                                value={selectedLot.quantity}
                                onChange={(e) => {
                                  const newQuantity = Number(e.target.value);
                                  setSelectedLots(selectedLots.map(sl => 
                                    sl.lotId === selectedLot.lotId 
                                      ? { ...sl, quantity: newQuantity }
                                      : sl
                                  ));
                                }}
                                className="w-20"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeIngredientLot(selectedLot.lotId)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <Select
                    onValueChange={(value) => {
                      const lotId = Number(value);
                      const lot = availableIngredientLots.find(l => l.id === lotId);
                      if (lot) {
                        addIngredientLot(lot.ingredient.id, lotId, 1);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Add ingredient lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIngredientLots
                        .filter(lot => !selectedLots.find(sl => sl.lotId === lot.id))
                        .map((lot) => (
                          <SelectItem key={lot.id} value={String(lot.id)}>
                            <div className="flex flex-col">
                              <div className="font-medium">{lot.ingredient.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {lot.internalLotCode} - {lot.quantityRemaining} available
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Production Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Production Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Special instructions, handling requirements, or other notes..."
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional notes for the production team
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Planned Start Time */}
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Planned Start Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating...' : 'Start Production Run'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
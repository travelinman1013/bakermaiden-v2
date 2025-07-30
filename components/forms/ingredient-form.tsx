"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const ingredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required").max(100, "Name must be less than 100 characters"),
  unit: z.string().min(1, "Unit is required").max(20, "Unit must be less than 20 characters"),
  currentStock: z.coerce.number().min(0, "Stock cannot be negative"),
  minStock: z.coerce.number().min(0, "Minimum stock cannot be negative"),
  maxStock: z.coerce.number().min(1, "Maximum stock must be at least 1"),
  unitCost: z.coerce.number().min(0, "Unit cost cannot be negative"),
})

type IngredientFormData = z.infer<typeof ingredientSchema>

interface IngredientFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: IngredientFormData) => void
  initialData?: Partial<IngredientFormData>
  isEditing?: boolean
}

export function IngredientForm({ open, onOpenChange, onSubmit, initialData, isEditing = false }: IngredientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<IngredientFormData>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: initialData,
  })

  const maxStock = watch("maxStock")

  const handleFormSubmit = async (data: IngredientFormData) => {
    setIsSubmitting(true)
    try {
      // Validate that maxStock is greater than minStock
      if (data.maxStock <= data.minStock) {
        alert("Maximum stock must be greater than minimum stock")
        return
      }
      
      await onSubmit(data)
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting ingredient:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Ingredient" : "Add New Ingredient"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the ingredient details below." : "Add a new ingredient to your inventory."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ingredient Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., All-Purpose Flour"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                {...register("unit")}
                placeholder="e.g., lbs, oz, cups"
              />
              {errors.unit && (
                <p className="text-sm text-destructive">{errors.unit.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost ($)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                {...register("unitCost")}
                placeholder="2.50"
              />
              {errors.unitCost && (
                <p className="text-sm text-destructive">{errors.unitCost.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentStock">Current Stock</Label>
              <Input
                id="currentStock"
                type="number"
                step="0.1"
                {...register("currentStock")}
                placeholder="25"
              />
              {errors.currentStock && (
                <p className="text-sm text-destructive">{errors.currentStock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input
                id="minStock"
                type="number"
                step="0.1"
                {...register("minStock")}
                placeholder="10"
              />
              {errors.minStock && (
                <p className="text-sm text-destructive">{errors.minStock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStock">Max Stock</Label>
              <Input
                id="maxStock"
                type="number"
                step="0.1"
                {...register("maxStock")}
                placeholder="50"
              />
              {errors.maxStock && (
                <p className="text-sm text-destructive">{errors.maxStock.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Ingredient" : "Add Ingredient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
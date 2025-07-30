"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const recipeSchema = z.object({
  name: z.string().min(1, "Recipe name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  servings: z.coerce.number().min(1, "Servings must be at least 1").max(1000, "Servings must be less than 1000"),
  prepTime: z.string().min(1, "Prep time is required"),
})

type RecipeFormData = z.infer<typeof recipeSchema>

interface RecipeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: RecipeFormData) => void
  initialData?: Partial<RecipeFormData>
  isEditing?: boolean
}

export function RecipeForm({ open, onOpenChange, onSubmit, initialData, isEditing = false }: RecipeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: initialData,
  })

  const handleFormSubmit = async (data: RecipeFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error("Error submitting recipe:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Recipe" : "Add New Recipe"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the recipe details below." : "Create a new recipe for your bakery."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Recipe Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Chocolate Chip Cookies"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Brief description of the recipe"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                {...register("servings")}
                placeholder="12"
              />
              {errors.servings && (
                <p className="text-sm text-destructive">{errors.servings.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time</Label>
              <Input
                id="prepTime"
                {...register("prepTime")}
                placeholder="e.g., 2 hours"
              />
              {errors.prepTime && (
                <p className="text-sm text-destructive">{errors.prepTime.message}</p>
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
              {isSubmitting ? "Saving..." : isEditing ? "Update Recipe" : "Create Recipe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
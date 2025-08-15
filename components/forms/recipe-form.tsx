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
  description: z.string().max(2000, "Description must be less than 2000 characters").optional(),
  version: z.string().max(10, "Version must be 10 characters or less").default("1.0").optional(),
  isActive: z.boolean().default(true),
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

          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              {...register("version")}
              placeholder="1.0"
            />
            {errors.version && (
              <p className="text-sm text-destructive">{errors.version.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="isActive" className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                {...register("isActive")}
                className="rounded border-gray-300"
              />
              <span>Active Recipe</span>
            </Label>
            {errors.isActive && (
              <p className="text-sm text-destructive">{errors.isActive.message}</p>
            )}
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
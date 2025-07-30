"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Edit, Trash2, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { RecipeForm } from "@/components/forms/recipe-form"

// Recipe type definition
type Recipe = {
  id: string
  name: string
  description: string | null
  servings: number | null
  prepTime: string | null
  createdAt: string
  updatedAt: string
  ingredientCount: number
}

export default function RecipesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const { toast } = useToast()

  // Fetch recipes from API
  const fetchRecipes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/recipes')
      if (!response.ok) {
        throw new Error('Failed to fetch recipes')
      }
      const data = await response.json()
      setRecipes(data.recipes)
    } catch (error) {
      console.error('Error fetching recipes:', error)
      toast({
        title: "Error",
        description: "Failed to load recipes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load recipes on mount
  useEffect(() => {
    fetchRecipes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRecipe = async (data: any) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create recipe')
      }

      const result = await response.json()
      
      // Add the new recipe to the list
      setRecipes(prev => [{
        ...result.recipe,
        ingredientCount: 0
      }, ...prev])
      
      toast({
        title: "Success",
        description: "Recipe created successfully!",
      })
      
      setShowForm(false)
    } catch (error) {
      console.error('Error creating recipe:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create recipe. Please try again.",
        variant: "destructive",
      })
      throw error // Re-throw to let the form handle it
    }
  }

  const handleEditRecipe = async (data: any) => {
    if (!editingRecipe) return
    
    try {
      const response = await fetch(`/api/recipes/${editingRecipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update recipe')
      }

      const result = await response.json()
      
      // Update the recipe in the list
      setRecipes(prev => prev.map(recipe => 
        recipe.id === editingRecipe.id 
          ? { ...result.recipe, ingredientCount: recipe.ingredientCount }
          : recipe
      ))
      
      toast({
        title: "Success",
        description: "Recipe updated successfully!",
      })
      
      setEditingRecipe(null)
      setShowForm(false)
    } catch (error) {
      console.error('Error updating recipe:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update recipe. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return
    }

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete recipe')
      }

      // Remove the recipe from the list
      setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId))
      
      toast({
        title: "Success",
        description: "Recipe deleted successfully!",
      })
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete recipe. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditForm = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setShowForm(true)
  }

  const closeForm = () => {
    setEditingRecipe(null)
    setShowForm(false)
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (recipe.description && recipe.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
          <p className="text-gray-600 mt-2">Manage and organize your bakery recipes</p>
        </div>
        <Button 
          className="flex items-center space-x-2"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          <span>Add New Recipe</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-gray-600">Loading recipes...</span>
        </div>
      )}

      {/* Recipe Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {recipe.description || "No description available"}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => openEditForm(recipe)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRecipe(recipe.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(recipe.servings || recipe.prepTime) && (
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      {recipe.servings && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{recipe.servings} servings</span>
                        </div>
                      )}
                      {recipe.prepTime && <div>{recipe.prepTime}</div>}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {recipe.ingredientCount} ingredients
                    </span>
                    <span className="text-xs text-gray-400">
                      Created {new Date(recipe.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" className="w-full">
                      View Recipe
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? `No recipes match "${searchTerm}"` : "Get started by adding your first recipe"}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Recipe
          </Button>
        </div>
      )}

      {/* Recipe Form Modal */}
      <RecipeForm
        open={showForm}
        onOpenChange={closeForm}
        onSubmit={editingRecipe ? handleEditRecipe : handleAddRecipe}
        initialData={editingRecipe ? {
          name: editingRecipe.name,
          description: editingRecipe.description || undefined,
          servings: editingRecipe.servings || undefined,
          prepTime: editingRecipe.prepTime || undefined,
        } : undefined}
        isEditing={!!editingRecipe}
      />
    </div>
  )
}
"use client"

import { useState } from "react"
import { Plus, Search, Edit, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RecipeForm } from "@/components/forms/recipe-form"

// Mock data - this will come from API later
const mockRecipes = [
  {
    id: 1,
    name: "Classic Sourdough Bread",
    description: "Traditional sourdough with a perfect crust and chewy interior",
    ingredientCount: 5,
    servings: 2,
    prepTime: "6 hours",
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    name: "Chocolate Croissant",
    description: "Buttery, flaky pastry filled with rich dark chocolate",
    ingredientCount: 8,
    servings: 12,
    prepTime: "3 hours",
    createdAt: "2024-01-12"
  },
  {
    id: 3,
    name: "Vanilla Cupcakes",
    description: "Light and fluffy cupcakes with vanilla buttercream frosting",
    ingredientCount: 6,
    servings: 24,
    prepTime: "1.5 hours",
    createdAt: "2024-01-10"
  },
  {
    id: 4,
    name: "Blueberry Muffins",
    description: "Moist muffins bursting with fresh blueberries",
    ingredientCount: 7,
    servings: 12,
    prepTime: "45 minutes",
    createdAt: "2024-01-08"
  }
]

export default function RecipesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [recipes] = useState(mockRecipes)
  const [showForm, setShowForm] = useState(false)

  const handleAddRecipe = (data: any) => {
    console.log("Adding recipe:", data)
    // This will be connected to API later
  }

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
                  <CardDescription className="mt-2 line-clamp-2">
                    {recipe.description}
                  </CardDescription>
                </div>
                <div className="flex space-x-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{recipe.servings} servings</span>
                  </div>
                  <div>{recipe.prepTime}</div>
                </div>
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

      {/* Empty State */}
      {filteredRecipes.length === 0 && (
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
        onOpenChange={setShowForm}
        onSubmit={handleAddRecipe}
      />
    </div>
  )
}
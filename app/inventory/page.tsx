"use client"

import { useState } from "react"
import { Plus, Search, Edit, Trash2, AlertTriangle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { IngredientForm } from "@/components/forms/ingredient-form"

// Mock data - this will come from API later
const mockIngredients = [
  {
    id: 1,
    name: "All-Purpose Flour",
    unit: "lbs",
    currentStock: 25,
    minStock: 10,
    maxStock: 50,
    unitCost: 2.50,
    lastUpdated: "2024-01-15"
  },
  {
    id: 2,
    name: "Granulated Sugar",
    unit: "lbs",
    currentStock: 15,
    minStock: 8,
    maxStock: 30,
    unitCost: 1.75,
    lastUpdated: "2024-01-14"
  },
  {
    id: 3,
    name: "Vanilla Extract",
    unit: "oz",
    currentStock: 3,
    minStock: 5,
    maxStock: 15,
    unitCost: 12.00,
    lastUpdated: "2024-01-13"
  },
  {
    id: 4,
    name: "Active Dry Yeast",
    unit: "packets",
    currentStock: 2,
    minStock: 5,
    maxStock: 20,
    unitCost: 0.50,
    lastUpdated: "2024-01-12"
  },
  {
    id: 5,
    name: "Unsalted Butter",
    unit: "lbs",
    currentStock: 8,
    minStock: 5,
    maxStock: 20,
    unitCost: 4.25,
    lastUpdated: "2024-01-15"
  },
  {
    id: 6,
    name: "Large Eggs",
    unit: "dozen",
    currentStock: 6,
    minStock: 3,
    maxStock: 12,
    unitCost: 3.50,
    lastUpdated: "2024-01-14"
  }
]

function getStockStatus(current: number, min: number) {
  if (current <= min) return "low"
  if (current <= min * 1.5) return "medium"
  return "good"
}

function getStockColor(status: string) {
  switch (status) {
    case "low": return "text-red-600 bg-red-50 border-red-200"
    case "medium": return "text-orange-600 bg-orange-50 border-orange-200"
    default: return "text-green-600 bg-green-50 border-green-200"
  }
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [ingredients] = useState(mockIngredients)
  const [showForm, setShowForm] = useState(false)

  const handleAddIngredient = (data: any) => {
    console.log("Adding ingredient:", data)
    // This will be connected to API later
  }

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockCount = ingredients.filter(ing => getStockStatus(ing.currentStock, ing.minStock) === "low").length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-2">Track and manage your ingredient stock levels</p>
          {lowStockCount > 0 && (
            <div className="flex items-center space-x-2 mt-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{lowStockCount} items need attention</span>
            </div>
          )}
        </div>
        <Button 
          className="flex items-center space-x-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4" />
          <span>Add Ingredient</span>
        </Button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIngredients.map((ingredient) => {
          const stockStatus = getStockStatus(ingredient.currentStock, ingredient.minStock)
          const stockColor = getStockColor(stockStatus)
          
          return (
            <Card key={ingredient.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{ingredient.name}</CardTitle>
                    <CardDescription className="mt-1">
                      ${ingredient.unitCost.toFixed(2)} per {ingredient.unit}
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
                <div className="space-y-4">
                  {/* Stock Level */}
                  <div className={cn("p-3 rounded-lg border", stockColor)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">Current Stock</span>
                      </div>
                      {stockStatus === "low" && <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold">
                        {ingredient.currentStock} {ingredient.unit}
                      </div>
                      <div className="text-sm opacity-75">
                        Min: {ingredient.minStock} | Max: {ingredient.maxStock}
                      </div>
                    </div>
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Status: <span className={cn("font-medium capitalize", 
                        stockStatus === "low" ? "text-red-600" : 
                        stockStatus === "medium" ? "text-orange-600" : "text-green-600"
                      )}>
                        {stockStatus === "low" ? "Low Stock" : 
                         stockStatus === "medium" ? "Medium" : "Good"}
                      </span>
                    </span>
                  </div>

                  {/* Last Updated */}
                  <div className="text-xs text-gray-400 border-t pt-2">
                    Last updated: {new Date(ingredient.lastUpdated).toLocaleDateString()}
                  </div>

                  {/* Actions */}          
                  <div className="pt-2 space-y-2">
                    <Button variant="outline" className="w-full">
                      Update Stock
                    </Button>
                    {stockStatus === "low" && (
                      <Button variant="secondary" className="w-full text-sm">
                        Reorder Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredIngredients.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ingredients found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? `No ingredients match "${searchTerm}"` : "Get started by adding your first ingredient"}
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Ingredient
          </Button>
        </div>
      )}

      {/* Ingredient Form Modal */}
      <IngredientForm
        open={showForm}
        onOpenChange={setShowForm}
        onSubmit={handleAddIngredient}
      />
    </div>
  )
}
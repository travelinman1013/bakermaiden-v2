"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, BookOpen, Package, TrendingUp, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

// Dashboard stats type
type DashboardStats = {
  totalRecipes: number
  totalIngredients: number
  lowStockItems: number
}

type RecentItem = {
  id: string
  name: string
  type: 'recipe' | 'ingredient'
  createdAt: string
}

function getStockStatus(current: number, min: number | null) {
  if (!min) return "good"
  if (current <= min) return "low"
  if (current <= min * 1.5) return "medium"
  return "good"
}

function getTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)
  
  if (diffInHours < 1) return "Less than an hour ago"
  if (diffInHours < 24) return `${diffInHours} hours ago`
  if (diffInDays === 1) return "1 day ago"
  return `${diffInDays} days ago`
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRecipes: 0,
    totalIngredients: 0,
    lowStockItems: 0
  })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch recipes and ingredients in parallel
      const [recipesResponse, ingredientsResponse] = await Promise.all([
        fetch('/api/recipes'),
        fetch('/api/ingredients')
      ])

      if (!recipesResponse.ok || !ingredientsResponse.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const recipesData = await recipesResponse.json()
      const ingredientsData = await ingredientsResponse.json()
      
      // Calculate low stock items
      const lowStockCount = (ingredientsData.data || []).filter((ingredient: any) => 
        getStockStatus(ingredient.currentStock, ingredient.minimumStock) === "low"
      ).length
      
      // Update stats
      setStats({
        totalRecipes: (recipesData.data || []).length,
        totalIngredients: (ingredientsData.data || []).length,
        lowStockItems: lowStockCount
      })
      
      // Combine and sort recent items
      const recentRecipes = (recipesData.data || []).slice(0, 3).map((recipe: any) => ({
        id: recipe.id,
        name: recipe.name,
        type: 'recipe' as const,
        createdAt: recipe.createdAt
      }))
      
      const recentIngredients = (ingredientsData.data || []).slice(0, 3).map((ingredient: any) => ({
        id: ingredient.id,
        name: ingredient.name,
        type: 'ingredient' as const,
        createdAt: ingredient.createdAt
      }))
      
      const combined = [...recentRecipes, ...recentIngredients]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4)
      
      setRecentItems(combined)
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchDashboardData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here&apos;s what&apos;s happening in your bakery.</p>
        </div>
        <div className="flex space-x-3">
          <Link href="/recipes">
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Recipe</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-gray-600">Loading dashboard...</span>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecipes}</div>
              <p className="text-xs text-muted-foreground">
                Active recipes in system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ingredients</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIngredients}</div>
              <p className="text-xs text-muted-foreground">
                Items in inventory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">
                {stats.lowStockItems > 0 ? "Needs attention" : "All items stocked"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Items</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentItems.length}</div>
              <p className="text-xs text-muted-foreground">
                Recently added
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Jump to the most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/recipes" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Manage Recipes
              </Button>
            </Link>
            <Link href="/inventory" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Check Inventory
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Create Production Batch
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates and changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-gray-600">Loading activity...</span>
                </div>
              ) : recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Added new {item.type}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {item.name}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {getTimeAgo(item.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No recent activity</p>
                  <p className="text-xs text-gray-400 mt-1">Start by adding recipes or ingredients</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
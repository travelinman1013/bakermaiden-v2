import Link from "next/link"
import { ChefHat, BookOpen, Package, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="flex justify-center mb-6">
          <ChefHat className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to BakerMaiden
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Your professional bakery management system for recipes, inventory, and operations.
          Streamline your workflow and focus on what you do best - baking!
        </p>
        <Link href="/dashboard">
          <Button size="lg" className="text-lg px-8">
            Get Started
          </Button>
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <BarChart3 className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Dashboard Overview</CardTitle>
            <CardDescription>
              Monitor your bakery operations with comprehensive analytics and insights
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                View Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Recipe Management</CardTitle>
            <CardDescription>
              Organize and manage all your recipes with detailed ingredients and instructions
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/recipes">
              <Button variant="outline" className="w-full">
                Manage Recipes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Package className="h-12 w-12 text-primary" />
            </div>
            <CardTitle>Inventory Control</CardTitle>
            <CardDescription>
              Track your ingredient stock levels and manage your bakery inventory
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/inventory">
              <Button variant="outline" className="w-full">
                View Inventory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Built for Professional Bakers
        </h2>
        <p className="text-gray-600 max-w-3xl mx-auto">
          BakerMaiden is designed to help bakeries of all sizes manage their operations more efficiently. 
          From recipe management to inventory tracking, we provide the tools you need to run a successful bakery business.
        </p>
      </div>
    </div>
  )
}
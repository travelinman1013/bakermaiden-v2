"use client"

import { useState, useEffect } from "react"
import { Search, Package, AlertTriangle, Calendar, CheckCircle, XCircle, Clock, Filter, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// Ingredient Lot type based on API response structure
type IngredientLot = {
  id: number
  lotCode: string
  internalLotCode: string
  supplierLotCode: string | null
  supplierName: string
  quantityReceived: string
  quantityRemaining: string
  unit: string
  receivedDate: string
  expirationDate: string | null
  manufactureDate: string | null
  qualityStatus: 'pending' | 'passed' | 'failed' | 'quarantined'
  certificateUrl: string | null
  testResults: any | null
  storageConditions: string | null
  createdAt: string
  updatedAt: string
  Ingredient: {
    id: number
    name: string
    supplierName: string
    storageType: 'dry' | 'refrigerated' | 'frozen'
    allergens: string[]
    supplierCode: string | null
  }
  metrics: {
    daysUntilExpiration: number | null
    isExpired: boolean
    isNearExpiry: boolean
    isLowStock: boolean
    totalUsed: number
    usagePercentage: number
    remainingPercentage: number
  }
  usageHistory: Array<{
    productionRunId: number
    dailyLot: string
    quantityUsed: string
    qualityStatus: string
  }>
}

type InventorySummary = {
  total: number
  active: number
  expired: number
  nearExpiry: number
  lowStock: number
  qualityPending: number
  qualityFailed: number
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [qualityFilter, setQualityFilter] = useState<string>("all")
  const [storageFilter, setStorageFilter] = useState<string>("all")
  const [expiryFilter, setExpiryFilter] = useState<string>("all")
  const [ingredientLots, setIngredientLots] = useState<IngredientLot[]>([])
  const [summary, setSummary] = useState<InventorySummary>({
    total: 0,
    active: 0,
    expired: 0,
    nearExpiry: 0,
    lowStock: 0,
    qualityPending: 0,
    qualityFailed: 0
  })
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  // Fetch inventory data from API
  const fetchInventoryData = async (page = 1) => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })

      if (searchTerm) params.set('search', searchTerm)
      if (qualityFilter !== 'all') params.set('qualityStatus', qualityFilter)
      if (expiryFilter === 'expired') params.set('showExpired', 'true')
      if (expiryFilter === 'nearExpiry') params.set('nearExpiry', 'true')
      if (expiryFilter === 'lowStock') params.set('lowStock', 'true')

      const response = await fetch(`/api/ingredient-lots?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data')
      }

      const data = await response.json()
      setIngredientLots(data.data || [])
      setSummary(data.summary || summary)
      setCurrentPage(data.pagination?.page || 1)
      setTotalPages(data.pagination?.totalPages || 1)
      
    } catch (error) {
      console.error('Error fetching inventory data:', error)
      toast({
        title: "Error",
        description: "Failed to load inventory data. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount and when filters change
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchInventoryData(1)
    }, searchTerm ? 300 : 0) // Debounce search

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, qualityFilter, storageFilter, expiryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchInventoryData(page)
  }

  // Get quality status badge
  const getQualityStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'quarantined':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="h-3 w-3 mr-1" />Quarantined</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Get storage type badge
  const getStorageTypeBadge = (storageType: string) => {
    switch (storageType) {
      case 'frozen':
        return <Badge className="bg-blue-100 text-blue-800">Frozen</Badge>
      case 'refrigerated':
        return <Badge className="bg-cyan-100 text-cyan-800">Refrigerated</Badge>
      case 'dry':
        return <Badge className="bg-amber-100 text-amber-800">Dry Storage</Badge>
      default:
        return <Badge variant="outline">{storageType}</Badge>
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  // Get expiry warning
  const getExpiryStatus = (lot: IngredientLot) => {
    if (!lot.metrics) return null
    
    if (lot.metrics.isExpired) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>
    } else if (lot.metrics.isNearExpiry) {
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">
        {lot.metrics.daysUntilExpiration} days left
      </Badge>
    }
    return null
  }

  // Get stock warning
  const getStockStatus = (lot: IngredientLot) => {
    if (lot.metrics?.isLowStock) {
      return <Badge variant="destructive" className="text-xs">Low Stock</Badge>
    }
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Monitor ingredient lots, quality status, and stock levels</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && currentPage === 1 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-gray-600">Loading inventory...</span>
        </div>
      )}

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Lots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.lowStock}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Near Expiry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summary.nearExpiry}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.expired}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending QC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.qualityPending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed QC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.qualityFailed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by lot code, ingredient name, or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={qualityFilter} onValueChange={setQualityFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Quality Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="quarantined">Quarantined</SelectItem>
            </SelectContent>
          </Select>

          <Select value={expiryFilter} onValueChange={setExpiryFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="lowStock">Low Stock</SelectItem>
              <SelectItem value="nearExpiry">Near Expiry</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inventory Table */}
      {!loading && (
        <Card>
          <CardHeader>
            <CardTitle>Ingredient Lots</CardTitle>
            <CardDescription>
              Complete lot traceability and quality management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lot Code</TableHead>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Quality Status</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Stock Remaining</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredientLots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-medium">{lot.lotCode}</div>
                          <div className="text-sm text-gray-500">
                            Internal: {lot.internalLotCode}
                          </div>
                          {lot.supplierLotCode && (
                            <div className="text-sm text-gray-500">
                              Supplier: {lot.supplierLotCode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lot.Ingredient.name}</div>
                          {lot.Ingredient.allergens.length > 0 && (
                            <div className="text-sm text-gray-500">
                              Allergens: {lot.Ingredient.allergens.join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{lot.supplierName}</div>
                          {lot.Ingredient.supplierCode && (
                            <div className="text-sm text-gray-500">
                              Code: {lot.Ingredient.supplierCode}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getQualityStatusBadge(lot.qualityStatus)}
                      </TableCell>
                      <TableCell>
                        {getStorageTypeBadge(lot.Ingredient.storageType)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {parseFloat(lot.quantityRemaining).toLocaleString()} {lot.unit}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lot.metrics?.remainingPercentage}% remaining
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(lot.receivedDate)}</TableCell>
                      <TableCell>
                        <div>
                          <div>{formatDate(lot.expirationDate)}</div>
                          {getExpiryStatus(lot)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStockStatus(lot)}
                          {lot.usageHistory.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Used in {lot.usageHistory.length} batches
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {ingredientLots.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory found</h3>
                  <p className="text-gray-600">
                    {searchTerm || qualityFilter !== 'all' || expiryFilter !== 'all' 
                      ? "No lots match your current filters" 
                      : "No ingredient lots have been added yet"}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
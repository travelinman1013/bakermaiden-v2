"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary, ProductionTableErrorFallback } from '@/components/ui/error-boundary';

interface ProductionRun {
  id: number;
  dailyLot: string;
  cakeLot: string;
  icingLot: string;
  plannedQuantity: number | null;
  actualQuantity: number | null;
  qualityStatus: string | null;
  primaryOperatorId: number | null;
  equipmentStation: string | null;
  createdAt: string;
  updatedAt: string | null;
  // Add status field that was missing from interface
  status?: string;
  Recipe?: {
    id: number;
    name: string;
  };
  Pallet?: {
    id: number;
    palletCode: string | null;
    shippingStatus: string | null;
    quantityPacked: number | null;
  }[];
}

// Type guard for validating production run data structure
const isValidProductionRun = (data: any): data is ProductionRun => {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.id === 'number' &&
    typeof data.dailyLot === 'string' &&
    typeof data.cakeLot === 'string' &&
    typeof data.icingLot === 'string' &&
    typeof data.createdAt === 'string'
  );
};

// Safe property access helper
const safeGet = (obj: any, path: string, defaultValue: any = '') => {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

interface BatchListProps {
  onViewDetails?: (batchId: number) => void;
  onCreateNew?: () => void;
  onPrintBatchSheet?: (batchId: number) => void;
}

// Quality status colors based on Prisma QualityStatus enum
const qualityStatusColors = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  passed: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
  quarantined: 'bg-red-100 text-red-800 border-red-200',
};

export function BatchList({ onViewDetails, onCreateNew, onPrintBatchSheet }: BatchListProps) {
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [filteredRuns, setFilteredRuns] = useState<ProductionRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Fetch production runs with comprehensive error handling
  useEffect(() => {
    const fetchProductionRuns = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/production-runs');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error ${response.status}: ${errorText || 'Failed to fetch production runs'}`);
        }
        
        const responseData = await response.json();
        
        // Validate API response structure
        if (!responseData || typeof responseData !== 'object') {
          throw new Error('Invalid API response format');
        }
        
        // Handle different possible API response formats
        let runs: any[] = [];
        if (Array.isArray(responseData)) {
          runs = responseData;
        } else if (Array.isArray(responseData.data)) {
          runs = responseData.data;
        } else if (Array.isArray(responseData.productionRuns)) {
          runs = responseData.productionRuns;
        } else {
          console.warn('Unexpected API response structure:', responseData);
          runs = [];
        }
        
        // Validate and filter production run data
        const validRuns = runs.filter((run, index) => {
          if (!isValidProductionRun(run)) {
            console.warn(`Invalid production run at index ${index}:`, run);
            return false;
          }
          return true;
        });
        
        console.log(`Loaded ${validRuns.length} valid production runs out of ${runs.length} total`);
        setProductionRuns(validRuns);
        setFilteredRuns(validRuns);
        
      } catch (error) {
        console.error('Error fetching production runs:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(`Failed to load production runs: ${errorMessage}`);
        // Set empty arrays to prevent further errors
        setProductionRuns([]);
        setFilteredRuns([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductionRuns();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...productionRuns];

    // Search filter with safe property access
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(run => {
        try {
          // Safe access to all searchable fields
          const dailyLot = run.dailyLot?.toLowerCase() || '';
          const cakeLot = run.cakeLot?.toLowerCase() || '';
          const icingLot = run.icingLot?.toLowerCase() || '';
          const recipeName = safeGet(run, 'Recipe.name', '').toLowerCase();
          const station = run.equipmentStation?.toLowerCase() || '';
          
          return (
            dailyLot.includes(searchLower) ||
            cakeLot.includes(searchLower) ||
            icingLot.includes(searchLower) ||
            recipeName.includes(searchLower) ||
            station.includes(searchLower)
          );
        } catch (error) {
          console.warn('Error in search filter for run:', run, error);
          return false;
        }
      });
    }

    // Status filter - handle both status and qualityStatus fields
    if (statusFilter !== 'all') {
      filtered = filtered.filter(run => {
        // Check both possible status fields
        return run.status === statusFilter || run.qualityStatus === statusFilter;
      });
    }

    // Operator filter with safe conversion
    if (operatorFilter !== 'all') {
      filtered = filtered.filter(run => {
        try {
          return run.primaryOperatorId?.toString() === operatorFilter;
        } catch (error) {
          console.warn('Error filtering by operator for run:', run, error);
          return false;
        }
      });
    }

    // Date filter with safe date parsing
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(run => {
            try {
              const runDate = new Date(run.createdAt);
              return !isNaN(runDate.getTime()) && runDate >= filterDate;
            } catch (error) {
              console.warn('Invalid date for run:', run, error);
              return false;
            }
          });
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(run => {
            try {
              const runDate = new Date(run.createdAt);
              return !isNaN(runDate.getTime()) && runDate >= filterDate;
            } catch (error) {
              console.warn('Invalid date for run:', run, error);
              return false;
            }
          });
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(run => {
            try {
              const runDate = new Date(run.createdAt);
              return !isNaN(runDate.getTime()) && runDate >= filterDate;
            } catch (error) {
              console.warn('Invalid date for run:', run, error);
              return false;
            }
          });
          break;
      }
    }

    setFilteredRuns(filtered);
  }, [productionRuns, searchTerm, statusFilter, operatorFilter, dateFilter]);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  };

  const getUniqueOperators = () => {
    const operators = new Set<string>();
    try {
      productionRuns.forEach(run => {
        if (run?.primaryOperatorId != null) {
          try {
            operators.add(run.primaryOperatorId.toString());
          } catch (error) {
            console.warn('Error converting operator ID to string:', run.primaryOperatorId, error);
          }
        }
      });
    } catch (error) {
      console.warn('Error getting unique operators:', error);
    }
    return Array.from(operators).sort();
  };

  const calculateYield = (run: ProductionRun) => {
    try {
      if (!run?.actualQuantity || run.actualQuantity === 0 || !run?.plannedQuantity || run.plannedQuantity === 0) {
        return null;
      }
      const yield_ = (run.actualQuantity / run.plannedQuantity) * 100;
      if (isNaN(yield_) || !isFinite(yield_)) return null;
      return yield_.toFixed(1);
    } catch (error) {
      console.warn('Error calculating yield for run:', run, error);
      return null;
    }
  };

  const getQualityStatusBadgeClasses = (status: string | null | undefined) => {
    try {
      if (!status || typeof status !== 'string') {
        return 'bg-gray-100 text-gray-800 border-gray-200';
      }
      return qualityStatusColors[status as keyof typeof qualityStatusColors] || 'bg-gray-100 text-gray-800 border-gray-200';
    } catch (error) {
      console.warn('Error getting badge classes for status:', status, error);
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <div className="text-lg font-medium">Loading production runs...</div>
              <div className="text-sm text-muted-foreground">
                Connecting to database and fetching data
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">Failed to load production data</div>
              <div className="text-sm">{error}</div>
              <div className="text-sm text-muted-foreground">
                Please check your database connection or contact support if the issue persists.
              </div>
            </div>
          </AlertDescription>
        </Alert>
        <Card>
          <CardContent className="py-8 text-center">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="mt-4"
            >
              Retry Loading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={ProductionTableErrorFallback}>
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Production Runs Dashboard</CardTitle>
              <CardDescription>
                Manage and monitor all production batches
              </CardDescription>
            </div>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                Start New Run
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{productionRuns.length}</div>
                <p className="text-sm text-muted-foreground">Total Runs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {productionRuns.filter(r => r.status === 'IN_PROGRESS' || r.qualityStatus === 'pending').length}
                </div>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {productionRuns.filter(r => r.status === 'COMPLETED' || r.qualityStatus === 'passed').length}
                </div>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {productionRuns.reduce((sum, run) => {
                    try {
                      return sum + (run.Pallet?.length || 0);
                    } catch (error) {
                      console.warn('Error calculating pallet count for run:', run, error);
                      return sum;
                    }
                  }, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Total Pallets</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search batch, lot, recipe, or operator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="QUALITY_CHECK">Quality Check</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="RECALLED">Recalled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="operator-filter">Operator</Label>
              <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                <SelectTrigger id="operator-filter">
                  <SelectValue placeholder="All operators" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operators</SelectItem>
                  {getUniqueOperators().map(operator => (
                    <SelectItem key={operator} value={operator}>
                      {operator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-filter">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger id="date-filter">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Production Runs ({filteredRuns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Daily Lot</TableHead>
                  <TableHead className="min-w-[140px] hidden sm:table-cell">Recipe</TableHead>
                  <TableHead className="min-w-[120px] hidden md:table-cell">Lots</TableHead>
                  <TableHead className="min-w-[100px]">Quantity</TableHead>
                  <TableHead className="min-w-[80px] hidden md:table-cell">Yield</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[80px] hidden lg:table-cell">Quality</TableHead>
                  <TableHead className="min-w-[100px] hidden md:table-cell">Operator</TableHead>
                  <TableHead className="min-w-[120px] hidden lg:table-cell">Created</TableHead>
                  <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No production runs found matching your filters.
                      {productionRuns.length === 0 && (
                        <div className="mt-2 text-sm">
                          No production runs available. Create your first production run to get started.
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRuns.map((run) => {
                    try {
                      if (!run || !run.id) {
                        console.warn('Invalid run data:', run);
                        return null;
                      }
                      return (
                    <TableRow key={run.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="font-medium">{run.dailyLot}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {safeGet(run, 'Recipe.name', 'Unknown Recipe')}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div>
                          <div className="font-medium">
                            {safeGet(run, 'Recipe.name', 'Unknown Recipe')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {run.equipmentStation || 'No station assigned'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm space-y-1">
                          <div>Daily: {run.dailyLot || 'N/A'}</div>
                          <div>Cake: {run.cakeLot || 'N/A'}</div>
                          <div>Icing: {run.icingLot || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Planned: {run.plannedQuantity ?? 'TBD'}</div>
                          <div>Actual: {run.actualQuantity ?? 'TBD'}</div>
                          <div className="text-muted-foreground text-xs">units</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {(() => {
                          const yield_ = calculateYield(run);
                          return yield_ ? (
                            <Badge variant={Number(yield_) >= 95 ? 'default' : 'secondary'}>
                              {yield_}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getQualityStatusBadgeClasses(run.qualityStatus || 'pending')}`}
                        >
                          {((run.qualityStatus || 'pending').replace('_', ' '))}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {run.primaryOperatorId ? `Op. ${run.primaryOperatorId}` : 'Not assigned'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-sm">
                          {run.primaryOperatorId ? `Op. ${run.primaryOperatorId}` : 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm">
                          {formatDate(run.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-col sm:flex-row">
                          {onViewDetails && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onViewDetails(run.id)}
                              className="text-xs px-2 py-1"
                            >
                              View
                            </Button>
                          )}
                          {onPrintBatchSheet && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onPrintBatchSheet(run.id)}
                              className="text-xs px-2 py-1"
                            >
                              Print
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                      );
                    } catch (error) {
                      console.error('Error rendering production run:', run, error);
                      return (
                        <TableRow key={run?.id || Math.random()}>
                          <TableCell colSpan={10} className="text-center py-4 text-red-600">
                            Error displaying production run data
                          </TableCell>
                        </TableRow>
                      );
                    }
                  }).filter(Boolean)
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </ErrorBoundary>
  );
}
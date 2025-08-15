"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';

interface TraceabilityResult {
  type: 'forward' | 'backward' | 'recall';
  source?: any;
  target?: any;
  impactSummary?: any;
  productionRuns?: any[];
  ingredientLots?: any[];
  affectedPallets?: any[];
  traceabilityChain?: any[];
  customerImpact?: any[];
  riskAssessment?: any;
}

interface TraceabilityLookupProps {
  onExport?: (data: TraceabilityResult, format: 'pdf' | 'csv') => void;
}

export function TraceabilityLookup({ onExport }: TraceabilityLookupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'lot' | 'batch' | 'pallet'>('lot');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TraceabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      let endpoint = '';
      
      if (searchType === 'lot') {
        // For ingredient lot search, we'll try to find the lot first
        const lotsResponse = await fetch(`/api/ingredient-lots?search=${encodeURIComponent(searchQuery)}`);
        if (!lotsResponse.ok) {
          throw new Error('Failed to search ingredient lots');
        }
        const lotsData = await lotsResponse.json();
        
        if (lotsData.data && lotsData.data.length > 0) {
          const lotId = lotsData.data[0].id;
          endpoint = `/api/traceability/forward/${lotId}`;
        } else {
          throw new Error('No ingredient lot found with that code');
        }
      } else if (searchType === 'batch') {
        // For batch search, find the production run first
        const runsResponse = await fetch(`/api/production-runs?search=${encodeURIComponent(searchQuery)}`);
        if (!runsResponse.ok) {
          throw new Error('Failed to search production runs');
        }
        const runsData = await runsResponse.json();
        
        if (runsData.data && runsData.data.length > 0) {
          // For production run, we want to show the ingredients used
          setResults({
            type: 'backward',
            productionRuns: runsData.data,
            traceabilityChain: [{
              level: 1,
              type: 'production_run',
              id: runsData.data[0].id,
              description: `Production Run ${runsData.data[0].batchNumber}`,
              date: new Date(runsData.data[0].createdAt)
            }]
          });
          return;
        } else {
          throw new Error('No production run found with that batch number');
        }
      } else if (searchType === 'pallet') {
        // For pallet search, we need to find the pallet first
        try {
          const palletId = parseInt(searchQuery);
          endpoint = `/api/traceability/backward/${palletId}`;
        } catch {
          throw new Error('Invalid pallet ID format');
        }
      }

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch traceability data');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during search');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecallAssessment = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an ingredient lot code for recall assessment');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lotsResponse = await fetch(`/api/ingredient-lots?search=${encodeURIComponent(searchQuery)}`);
      if (!lotsResponse.ok) {
        throw new Error('Failed to search ingredient lots');
      }
      const lotsData = await lotsResponse.json();
      
      if (lotsData.data && lotsData.data.length > 0) {
        const lotId = lotsData.data[0].id;
        const response = await fetch(`/api/traceability/recall/${lotId}`);
        if (!response.ok) {
          throw new Error('Failed to generate recall assessment');
        }
        const data = await response.json();
        setResults({ ...data, type: 'recall' });
      } else {
        throw new Error('No ingredient lot found for recall assessment');
      }
    } catch (error) {
      console.error('Recall assessment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate recall assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lot Traceability Lookup</CardTitle>
          <CardDescription>
            Search by ingredient lot, production run, or pallet ID for complete traceability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search-input">Search Term</Label>
              <Input
                id="search-input"
                placeholder="Enter lot code, batch number, or pallet ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div>
              <Label htmlFor="search-type">Search Type</Label>
              <select
                id="search-type"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as 'lot' | 'batch' | 'pallet')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="lot">Ingredient Lot</option>
                <option value="batch">Production Run</option>
                <option value="pallet">Pallet ID</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRecallAssessment}
              disabled={isLoading || searchType !== 'lot'}
            >
              Recall Assessment
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Traceability Results</CardTitle>
              <div className="flex gap-2">
                {onExport && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onExport(results, 'pdf')}
                    >
                      Export PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onExport(results, 'csv')}
                    >
                      Export CSV
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="chain">Trace Chain</TabsTrigger>
                <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
                <TabsTrigger value="details">Detailed View</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {results.type === 'recall' && results.impactSummary && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="font-semibold">Recall Impact Summary</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Production Runs</div>
                            <div className="font-medium">{results.impactSummary.totalProductionRuns || 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Pallets Affected</div>
                            <div className="font-medium">{results.impactSummary.totalPalletsAffected || 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Shipped Products</div>
                            <div className="font-medium">{results.impactSummary.shippedProducts || 0}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Customers Affected</div>
                            <div className="font-medium">{results.impactSummary.customersAffected || 0}</div>
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {results.source && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Source Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Badge variant="outline">Lot Code</Badge>
                          <span>{results.source.ingredientLot?.lotCode}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">Ingredient</Badge>
                          <span>{results.source.ingredientLot?.ingredient?.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">Supplier</Badge>
                          <span>{results.source.ingredientLot?.supplierName}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">Status</Badge>
                          <Badge variant={results.source.ingredientLot?.status === 'IN_USE' ? 'default' : 'secondary'}>
                            {results.source.ingredientLot?.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {results.target && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Target Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Badge variant="outline">Pallet</Badge>
                          <span>{results.target.pallet?.palletNumber}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">Production Run</Badge>
                          <span>{results.target.productionRun?.batchNumber}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">Recipe</Badge>
                          <span>{results.target.productionRun?.recipe?.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">Status</Badge>
                          <Badge variant={results.target.pallet?.status === 'SHIPPED' ? 'default' : 'secondary'}>
                            {results.target.pallet?.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {results.riskAssessment && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span>Risk Level:</span>
                          <Badge 
                            variant="outline" 
                            className={`${getRiskLevelColor(results.riskAssessment.riskLevel)} text-white border-none`}
                          >
                            {results.riskAssessment.riskLevel}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Score: {results.riskAssessment.totalRiskScore}/100
                          </span>
                        </div>
                        {results.riskAssessment.recommendedActions && (
                          <div>
                            <div className="font-medium mb-2">Recommended Actions:</div>
                            <div className="flex flex-wrap gap-2">
                              {results.riskAssessment.recommendedActions.map((action: string, index: number) => (
                                <Badge key={index} variant="destructive">
                                  {action.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="chain" className="space-y-4">
                {results.traceabilityChain && results.traceabilityChain.length > 0 ? (
                  <div className="space-y-4">
                    {results.traceabilityChain.map((item: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">Level {item.level}</Badge>
                            <div className="flex-1">
                              <div className="font-medium">{item.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatDate(item.date)}
                              </div>
                            </div>
                            <Badge variant="secondary">{item.type.replace('_', ' ')}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No traceability chain data available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="impact" className="space-y-4">
                {results.customerImpact && results.customerImpact.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer Order</TableHead>
                            <TableHead>Pallets</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Shipped Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.customerImpact.map((impact: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{impact.customerOrder}</TableCell>
                              <TableCell>
                                {impact.pallets?.length || impact.pallets?.map?.((p: any) => p.palletNumber).join(', ') || 'N/A'}
                              </TableCell>
                              <TableCell>{impact.totalItems || 0}</TableCell>
                              <TableCell>
                                {impact.shippedDate ? formatDate(impact.shippedDate) : 'Not shipped'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {results.affectedPallets && results.affectedPallets.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Affected Pallets</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pallet Number</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Production Run</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.affectedPallets.map((pallet: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{pallet.palletNumber}</TableCell>
                              <TableCell>{pallet.location || 'Unknown'}</TableCell>
                              <TableCell>
                                <Badge variant={pallet.status === 'SHIPPED' ? 'default' : 'secondary'}>
                                  {pallet.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{pallet.productionRunId}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {results.ingredientLots && results.ingredientLots.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ingredient Lots</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lot Code</TableHead>
                            <TableHead>Ingredient</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Quantity Remaining</TableHead>
                            <TableHead>Quality Status</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.ingredientLots.map((lot: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{lot.lotCode}</TableCell>
                              <TableCell>{lot.ingredient?.name || 'N/A'}</TableCell>
                              <TableCell>{lot.supplierName}</TableCell>
                              <TableCell>{lot.quantityRemaining} {lot.unitOfMeasure}</TableCell>
                              <TableCell>
                                <Badge variant={lot.qualityStatus === 'PASSED' ? 'default' : 'secondary'}>
                                  {lot.qualityStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{lot.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {results.productionRuns && results.productionRuns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Production Runs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Batch Number</TableHead>
                            <TableHead>Recipe</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.productionRuns.map((run: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{run.batchNumber}</TableCell>
                              <TableCell>{run.recipe?.name || 'N/A'}</TableCell>
                              <TableCell>{run.actualQuantity || run.plannedQuantity} {run.unitOfMeasure}</TableCell>
                              <TableCell>
                                <Badge variant={run.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                  {run.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(run.createdAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
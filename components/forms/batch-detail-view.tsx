"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary, BatchDetailErrorFallback } from '@/components/ui/error-boundary';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BatchDetailViewProps {
  batchId: number;
  onUpdateStatus?: (batchId: number, updates: any) => Promise<void>;
  onPrintBatchSheet?: (batchId: number) => void;
  onBack?: () => void;
}

interface ProductionRunDetail {
  id: number;
  batchNumber: string;
  dailyLot: string;
  cakeLot: string;
  icingLot: string;
  plannedQuantity: number;
  actualQuantity: number | null;
  unitOfMeasure: string;
  plannedStartTime: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  durationMinutes: number | null;
  primaryOperator: string | null;
  assistantOperators: string[];
  productionLine: string | null;
  shift: string | null;
  status: string;
  qualityStatus: string;
  qualityNotes: string | null;
  qualityCheckBy: string | null;
  qualityCheckAt: string | null;
  productionNotes: string | null;
  issuesEncountered: string | null;
  temperature: number | null;
  humidity: number | null;
  createdAt: string;
  updatedAt: string;
  recipe: {
    id: number;
    name: string;
    description: string | null;
    version: string;
  } | null;
  batchIngredients: Array<{
    id: number;
    quantityUsed: number;
    unitOfMeasure: string;
    percentageOfTotal: number | null;
    addedAt: string | null;
    addedBy: string | null;
    usageNotes: string | null;
    ingredient: {
      id: number;
      name: string;
      type: string;
      allergens: string[];
    };
    ingredientLot: {
      id: number;
      lotCode: string;
      supplierName: string;
      expirationDate: string | null;
      qualityStatus: string;
    };
  }>;
  pallets: Array<{
    id: number;
    palletNumber: string;
    weight: number | null;
    itemCount: number | null;
    location: string | null;
    status: string;
    shippedAt: string | null;
    customerOrder: string | null;
  }>;
}

const statusColors = {
  PLANNED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  QUALITY_CHECK: 'bg-purple-100 text-purple-800 border-purple-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
  RECALLED: 'bg-red-100 text-red-800 border-red-200',
};

const qualityStatusColors = {
  PENDING: 'bg-gray-100 text-gray-800 border-gray-200',
  PASSED: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
  CONDITIONAL_PASS: 'bg-orange-100 text-orange-800 border-orange-200',
};

export function BatchDetailView({ batchId, onUpdateStatus, onPrintBatchSheet, onBack }: BatchDetailViewProps) {
  const [batch, setBatch] = useState<ProductionRunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    actualQuantity: '',
    actualEndTime: '',
    status: '',
    qualityStatus: '',
    qualityNotes: '',
    qualityCheckBy: '',
    productionNotes: '',
    issuesEncountered: '',
    temperature: '',
    humidity: '',
  });

  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/production-runs/${batchId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch batch details');
        }
        const data = await response.json();
        setBatch(data);
        
        // Initialize update form with current values
        setUpdateForm({
          actualQuantity: data.actualQuantity?.toString() || '',
          actualEndTime: data.actualEndTime ? new Date(data.actualEndTime).toISOString().slice(0, 16) : '',
          status: data.status,
          qualityStatus: data.qualityStatus,
          qualityNotes: data.qualityNotes || '',
          qualityCheckBy: data.qualityCheckBy || '',
          productionNotes: data.productionNotes || '',
          issuesEncountered: data.issuesEncountered || '',
          temperature: data.temperature?.toString() || '',
          humidity: data.humidity?.toString() || '',
        });
      } catch (error) {
        console.error('Error fetching batch details:', error);
        setError('Failed to load batch details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchDetails();
  }, [batchId]);

  const handleUpdateBatch = async () => {
    if (!onUpdateStatus || !batch) return;
    
    try {
      setIsUpdating(true);
      
      const updates: any = {
        status: updateForm.status,
        qualityStatus: updateForm.qualityStatus,
      };
      
      if (updateForm.actualQuantity) {
        updates.actualQuantity = Number(updateForm.actualQuantity);
      }
      if (updateForm.actualEndTime) {
        updates.actualEndTime = new Date(updateForm.actualEndTime).toISOString();
      }
      if (updateForm.qualityNotes) {
        updates.qualityNotes = updateForm.qualityNotes;
      }
      if (updateForm.qualityCheckBy) {
        updates.qualityCheckBy = updateForm.qualityCheckBy;
        updates.qualityCheckAt = new Date().toISOString();
      }
      if (updateForm.productionNotes) {
        updates.productionNotes = updateForm.productionNotes;
      }
      if (updateForm.issuesEncountered) {
        updates.issuesEncountered = updateForm.issuesEncountered;
      }
      if (updateForm.temperature) {
        updates.temperature = Number(updateForm.temperature);
      }
      if (updateForm.humidity) {
        updates.humidity = Number(updateForm.humidity);
      }
      
      await onUpdateStatus(batchId, updates);
      
      // Refresh batch details
      const response = await fetch(`/api/production-runs/${batchId}`);
      if (response.ok) {
        const updatedData = await response.json();
        setBatch(updatedData);
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      setError('Failed to update batch');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateYield = () => {
    if (!batch?.actualQuantity || batch.actualQuantity === 0) return null;
    return ((batch.actualQuantity / batch.plannedQuantity) * 100).toFixed(1);
  };

  const calculateDuration = () => {
    if (!batch?.actualStartTime || !batch?.actualEndTime) return null;
    const start = new Date(batch.actualStartTime);
    const end = new Date(batch.actualEndTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
    return `${diffHours} hours`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div>Loading batch details...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !batch) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || 'Batch not found'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <ErrorBoundary fallback={BatchDetailErrorFallback}>
      <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">{batch.batchNumber || 'Untitled Batch'}</CardTitle>
              <CardDescription>
                {batch.recipe?.name || 'Unknown Recipe'} - Version {batch.recipe?.version || 'N/A'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {onPrintBatchSheet && (
                <Button variant="outline" onClick={() => onPrintBatchSheet(batchId)}>
                  Print Batch Sheet
                </Button>
              )}
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Back to List
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <Badge className={statusColors[(batch.status || 'PLANNED') as keyof typeof statusColors]}>
                {(batch.status || 'PLANNED').replace('_', ' ')}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Quality Status</div>
              <Badge className={qualityStatusColors[(batch.qualityStatus || 'PENDING') as keyof typeof qualityStatusColors]}>
                {batch.qualityStatus || 'PENDING'}
              </Badge>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Yield</div>
              <div className="text-lg font-semibold">
                {calculateYield() ? `${calculateYield()}%` : 'TBD'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Pallets</div>
              <div className="text-lg font-semibold">{batch.pallets?.length || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="pallets">Pallets</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="update">Update</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Production Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Daily Lot</div>
                    <div>{batch.dailyLot || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Cake Lot</div>
                    <div>{batch.cakeLot || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Icing Lot</div>
                    <div>{batch.icingLot || 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Production Line</div>
                    <div>{batch.productionLine || 'Not specified'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Planned Quantity</div>
                  <div>{batch.plannedQuantity || 'Not set'} {batch.unitOfMeasure || 'units'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Actual Quantity</div>
                  <div>{batch.actualQuantity || 'TBD'} {batch.actualQuantity ? (batch.unitOfMeasure || 'units') : ''}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Staff & Timing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Primary Operator</div>
                  <div>{batch.primaryOperator || 'Not assigned'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Assistant Operators</div>
                  <div>
                    {(batch.assistantOperators && batch.assistantOperators.length > 0) 
                      ? batch.assistantOperators.join(', ')
                      : 'None assigned'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Shift</div>
                  <div>{batch.shift || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Start Time</div>
                  <div>{formatDate(batch.actualStartTime || batch.plannedStartTime)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">End Time</div>
                  <div>{formatDate(batch.actualEndTime)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Duration</div>
                  <div>{calculateDuration() || 'TBD'}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Environmental Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Temperature</div>
                  <div>{batch.temperature ? `${batch.temperature}°C` : 'Not recorded'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Humidity</div>
                  <div>{batch.humidity ? `${batch.humidity}%` : 'Not recorded'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {batch.productionNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Production Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{batch.productionNotes}</p>
              </CardContent>
            </Card>
          )}

          {batch.issuesEncountered && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Issues Encountered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700">{batch.issuesEncountered}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ingredients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ingredient Lots Used</CardTitle>
              <CardDescription>Complete traceability for all ingredients</CardDescription>
            </CardHeader>
            <CardContent>
              {(!batch.batchIngredients || batch.batchIngredients.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  No ingredient lots recorded for this batch.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingredient</TableHead>
                      <TableHead>Lot Code</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity Used</TableHead>
                      <TableHead>Added By</TableHead>
                      <TableHead>Quality Status</TableHead>
                      <TableHead>Allergens</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.batchIngredients.map((batchIngredient) => (
                      <TableRow key={batchIngredient.id}>
                        <TableCell className="font-medium">
                          {batchIngredient.ingredient.name}
                        </TableCell>
                        <TableCell>{batchIngredient.ingredientLot.lotCode}</TableCell>
                        <TableCell>{batchIngredient.ingredientLot.supplierName}</TableCell>
                        <TableCell>
                          {batchIngredient.quantityUsed} {batchIngredient.unitOfMeasure}
                        </TableCell>
                        <TableCell>{batchIngredient.addedBy || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={qualityStatusColors[batchIngredient.ingredientLot.qualityStatus as keyof typeof qualityStatusColors]}>
                            {batchIngredient.ingredientLot.qualityStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {batchIngredient.ingredient.allergens.map(allergen => (
                              <Badge key={allergen} variant="outline" className="text-xs">
                                {allergen}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pallets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pallets Produced</CardTitle>
              <CardDescription>Track all pallets from this production run</CardDescription>
            </CardHeader>
            <CardContent>
              {(!batch.pallets || batch.pallets.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pallets recorded for this batch.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pallet Number</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Item Count</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Customer Order</TableHead>
                      <TableHead>Shipped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batch.pallets.map((pallet) => (
                      <TableRow key={pallet.id}>
                        <TableCell className="font-medium">{pallet.palletNumber}</TableCell>
                        <TableCell>{pallet.weight ? `${pallet.weight} kg` : 'N/A'}</TableCell>
                        <TableCell>{pallet.itemCount || 'N/A'}</TableCell>
                        <TableCell>{pallet.location || 'Not specified'}</TableCell>
                        <TableCell>
                          <Badge variant={pallet.status === 'SHIPPED' ? 'default' : 'secondary'}>
                            {pallet.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{pallet.customerOrder || 'N/A'}</TableCell>
                        <TableCell>{formatDate(pallet.shippedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quality Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Quality Status</div>
                  <Badge className={qualityStatusColors[(batch.qualityStatus || 'PENDING') as keyof typeof qualityStatusColors]}>
                    {batch.qualityStatus || 'PENDING'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Quality Checked By</div>
                  <div>{batch.qualityCheckBy || 'Not yet checked'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Quality Check Date</div>
                  <div>{formatDate(batch.qualityCheckAt)}</div>
                </div>
              </div>
              
              {batch.qualityNotes && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Quality Notes</div>
                  <div className="p-3 bg-muted rounded-lg">{batch.qualityNotes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="update" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Production Run</CardTitle>
              <CardDescription>
                Update status, quality information, and production details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Production Status</Label>
                  <Select value={updateForm.status} onValueChange={(value) => setUpdateForm({...updateForm, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">Planned</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="QUALITY_CHECK">Quality Check</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="qualityStatus">Quality Status</Label>
                  <Select value={updateForm.qualityStatus} onValueChange={(value) => setUpdateForm({...updateForm, qualityStatus: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PASSED">Passed</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="CONDITIONAL_PASS">Conditional Pass</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="actualQuantity">Actual Quantity</Label>
                  <Input
                    id="actualQuantity"
                    type="number"
                    value={updateForm.actualQuantity}
                    onChange={(e) => setUpdateForm({...updateForm, actualQuantity: e.target.value})}
                    placeholder="Actual quantity produced"
                  />
                </div>

                <div>
                  <Label htmlFor="actualEndTime">End Time</Label>
                  <Input
                    id="actualEndTime"
                    type="datetime-local"
                    value={updateForm.actualEndTime}
                    onChange={(e) => setUpdateForm({...updateForm, actualEndTime: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={updateForm.temperature}
                    onChange={(e) => setUpdateForm({...updateForm, temperature: e.target.value})}
                    placeholder="Production temperature"
                  />
                </div>

                <div>
                  <Label htmlFor="humidity">Humidity (%)</Label>
                  <Input
                    id="humidity"
                    type="number"
                    step="0.1"
                    value={updateForm.humidity}
                    onChange={(e) => setUpdateForm({...updateForm, humidity: e.target.value})}
                    placeholder="Production humidity"
                  />
                </div>

                <div>
                  <Label htmlFor="qualityCheckBy">Quality Checked By</Label>
                  <Input
                    id="qualityCheckBy"
                    value={updateForm.qualityCheckBy}
                    onChange={(e) => setUpdateForm({...updateForm, qualityCheckBy: e.target.value})}
                    placeholder="QC inspector name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="qualityNotes">Quality Notes</Label>
                <Textarea
                  id="qualityNotes"
                  value={updateForm.qualityNotes}
                  onChange={(e) => setUpdateForm({...updateForm, qualityNotes: e.target.value})}
                  placeholder="Quality control notes..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="productionNotes">Production Notes</Label>
                <Textarea
                  id="productionNotes"
                  value={updateForm.productionNotes}
                  onChange={(e) => setUpdateForm({...updateForm, productionNotes: e.target.value})}
                  placeholder="General production notes..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="issuesEncountered">Issues Encountered</Label>
                <Textarea
                  id="issuesEncountered"
                  value={updateForm.issuesEncountered}
                  onChange={(e) => setUpdateForm({...updateForm, issuesEncountered: e.target.value})}
                  placeholder="Any issues or problems during production..."
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdateBatch} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Production Run'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </ErrorBoundary>
  );
}
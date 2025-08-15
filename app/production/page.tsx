"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProductionRunForm } from '@/components/forms/production-run-form';
import { BatchList } from '@/components/forms/batch-list';
import { BatchDetailView } from '@/components/forms/batch-detail-view';
import { TraceabilityLookup } from '@/components/forms/traceability-lookup';
import { PrintableBatchSheet } from '@/components/forms/printable-batch-sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ErrorBoundary, ProductionTableErrorFallback } from '@/components/ui/error-boundary';
import { LoadingCard } from '@/components/ui/loading-spinner';

interface Recipe {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [showBatchSheet, setShowBatchSheet] = useState<number | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  // Fetch recipes on component mount
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes');
        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }
        const data = await response.json();
        setRecipes(data.data || []);
      } catch (error) {
        console.error('Error fetching recipes:', error);
        setError('Failed to load recipes');
      }
    };

    fetchRecipes();
  }, []);

  const handleCreateProductionRun = async (formData: any) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/production-runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create production run');
      }

      const newProductionRun = await response.json();
      setSuccessMessage(`Production run ${newProductionRun.dailyLot} created successfully!`);
      setActiveTab('dashboard'); // Switch back to dashboard view
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error creating production run:', error);
      setError(error instanceof Error ? error.message : 'Failed to create production run');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBatch = async (batchId: number, updates: any) => {
    try {
      const response = await fetch(`/api/production-runs/${batchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update production run');
      }

      setSuccessMessage('Production run updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating production run:', error);
      setError(error instanceof Error ? error.message : 'Failed to update production run');
      throw error; // Re-throw so component can handle it
    }
  };

  const handleViewBatchDetails = (batchId: number) => {
    setSelectedBatchId(batchId);
    setActiveTab('details');
  };

  const handlePrintBatchSheet = (batchId: number) => {
    setShowBatchSheet(batchId);
  };

  const handleExportTraceability = (data: any, format: 'pdf' | 'csv') => {
    // This would typically generate and download the export file
    console.log(`Exporting traceability data as ${format}:`, data);
    // Implementation would depend on your export library/service
    alert(`Export functionality for ${format} would be implemented here`);
  };

  if (showBatchSheet) {
    return (
      <PrintableBatchSheet
        batchId={showBatchSheet}
        onClose={() => setShowBatchSheet(null)}
      />
    );
  }

  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      console.error('Production page error:', error, errorInfo);
      // Here you could send error to logging service
    }}>
      <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Production Tracking System</CardTitle>
            <CardDescription>
              Complete lot traceability and production management for FDA compliance
            </CardDescription>
          </CardHeader>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="create">Create Run</TabsTrigger>
            <TabsTrigger value="traceability">Traceability</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <ErrorBoundary fallback={ProductionTableErrorFallback}>
              <BatchList
                onViewDetails={handleViewBatchDetails}
                onCreateNew={() => setActiveTab('create')}
                onPrintBatchSheet={handlePrintBatchSheet}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <ErrorBoundary fallback={ProductionTableErrorFallback}>
              <ProductionRunForm
                recipes={recipes}
                onSubmit={handleCreateProductionRun}
                onCancel={() => setActiveTab('dashboard')}
                isSubmitting={isSubmitting}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="traceability" className="space-y-4">
            <ErrorBoundary fallback={ProductionTableErrorFallback}>
              <TraceabilityLookup onExport={handleExportTraceability} />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {selectedBatchId ? (
              <ErrorBoundary fallback={ProductionTableErrorFallback}>
                <BatchDetailView
                  batchId={selectedBatchId}
                  onUpdateStatus={handleUpdateBatch}
                  onPrintBatchSheet={handlePrintBatchSheet}
                  onBack={() => {
                    setActiveTab('dashboard');
                    setSelectedBatchId(null);
                  }}
                />
              </ErrorBoundary>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">No batch selected</p>
                    <Button onClick={() => setActiveTab('dashboard')}>View Dashboard</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
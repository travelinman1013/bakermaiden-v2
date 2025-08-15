"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRCode from 'qrcode';

interface PrintableBatchSheetProps {
  batchId: number;
  onClose?: () => void;
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
  primaryOperator: string | null;
  assistantOperators: string[];
  productionLine: string | null;
  shift: string | null;
  status: string;
  qualityStatus: string;
  productionNotes: string | null;
  temperature: number | null;
  humidity: number | null;
  createdAt: string;
  recipe: {
    id: number;
    name: string;
    description: string | null;
    version: string;
  };
  batchIngredients: Array<{
    id: number;
    quantityUsed: number;
    unitOfMeasure: string;
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
}

const qualityCheckSteps = [
  'Visual appearance check',
  'Texture and consistency',
  'Color verification',
  'Aroma assessment',
  'Weight/portion verification',
  'Packaging integrity',
  'Label accuracy',
  'Temperature check',
  'Foreign object inspection',
  'Overall quality approval'
];

const productionSteps = [
  'Verify recipe and ingredients',
  'Check equipment cleanliness',
  'Preheat ovens to correct temperature',
  'Mix ingredients per recipe',
  'Portion and shape products',
  'Bake according to specifications',
  'Cool to proper temperature',
  'Apply icing/decorations',
  'Package products',
  'Label and code pallets'
];

export function PrintableBatchSheet({ batchId, onClose }: PrintableBatchSheetProps) {
  const [batch, setBatch] = useState<ProductionRunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

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

        // Generate QR code for batch traceability
        const batchUrl = `${window.location.origin}/production/${batchId}`;
        const qrDataUrl = await QRCode.toDataURL(batchUrl, {
          width: 128,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (error) {
        console.error('Error fetching batch details:', error);
        setError('Failed to load batch details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatchDetails();
  }, [batchId]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Batch Sheet - ${batch?.batchNumber}</title>
          <style>
            ${getPreviewStyles()}
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const getPreviewStyles = () => `
    body {
      font-family: Arial, sans-serif;
      line-height: 1.4;
      margin: 0;
      padding: 20px;
      font-size: 12px;
    }
    .batch-sheet {
      max-width: 8.5in;
      margin: 0 auto;
      background: white;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .sheet-title {
      font-size: 18px;
      font-weight: bold;
    }
    .info-section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      background-color: #f0f0f0;
      padding: 5px;
      border: 1px solid #000;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 10px;
    }
    .info-item {
      border: 1px solid #ccc;
      padding: 5px;
    }
    .info-label {
      font-weight: bold;
      font-size: 10px;
      color: #666;
    }
    .info-value {
      margin-top: 2px;
    }
    .ingredients-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .ingredients-table th,
    .ingredients-table td {
      border: 1px solid #000;
      padding: 4px;
      text-align: left;
    }
    .ingredients-table th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .checklist {
      columns: 2;
      column-gap: 20px;
    }
    .checklist-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      break-inside: avoid;
    }
    .checkbox {
      width: 15px;
      height: 15px;
      border: 2px solid #000;
      margin-right: 8px;
      flex-shrink: 0;
    }
    .signature-section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .signature-line {
      border-bottom: 1px solid #000;
      margin-bottom: 5px;
      height: 30px;
    }
    .qr-section {
      float: right;
      text-align: center;
      margin: 0 0 20px 20px;
    }
    .allergen-badge {
      display: inline-block;
      background-color: #ffeb3b;
      border: 1px solid #f57f17;
      padding: 2px 6px;
      margin: 2px;
      font-size: 10px;
      border-radius: 3px;
    }
    .critical-badge {
      background-color: #f44336;
      color: white;
    }
    @media print {
      body { margin: 0; padding: 15px; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
    }
  `;

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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div>Loading batch sheet...</div>
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
    <div className="space-y-4">
      <div className="no-print flex justify-between items-center">
        <h2 className="text-2xl font-bold">Batch Sheet Preview</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint}>Print Batch Sheet</Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>

      <div 
        ref={printRef}
        className="batch-sheet bg-white border border-gray-300 p-8 mx-auto"
        style={{ maxWidth: '8.5in', minHeight: '11in' }}
      >
        <div className="header">
          <div className="company-name">BakerMaiden</div>
          <div className="sheet-title">PRODUCTION BATCH SHEET</div>
          <div className="text-sm mt-2">
            Generated: {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* QR Code Section */}
        {qrCodeUrl && (
          <div className="qr-section">
            <img src={qrCodeUrl} alt="Batch QR Code" className="mx-auto mb-2" />
            <div className="text-xs font-bold">Scan for Details</div>
            <div className="text-xs">{batch.batchNumber}</div>
          </div>
        )}

        {/* Basic Information */}
        <div className="info-section">
          <div className="section-title">BATCH INFORMATION</div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">BATCH NUMBER</div>
              <div className="info-value font-bold text-lg">{batch.batchNumber}</div>
            </div>
            <div className="info-item">
              <div className="info-label">RECIPE</div>
              <div className="info-value font-bold">{batch.recipe.name} v{batch.recipe.version}</div>
            </div>
            <div className="info-item">
              <div className="info-label">DAILY LOT</div>
              <div className="info-value">{batch.dailyLot}</div>
            </div>
            <div className="info-item">
              <div className="info-label">STATUS</div>
              <div className="info-value">
                <Badge className={batch.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {batch.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">CAKE LOT</div>
              <div className="info-value">{batch.cakeLot}</div>
            </div>
            <div className="info-item">
              <div className="info-label">ICING LOT</div>
              <div className="info-value">{batch.icingLot}</div>
            </div>
            <div className="info-item">
              <div className="info-label">PLANNED QUANTITY</div>
              <div className="info-value">{batch.plannedQuantity} {batch.unitOfMeasure}</div>
            </div>
            <div className="info-item">
              <div className="info-label">ACTUAL QUANTITY</div>
              <div className="info-value font-bold">{batch.actualQuantity || '_____'} {batch.unitOfMeasure}</div>
            </div>
          </div>
        </div>

        {/* Staff and Production Details */}
        <div className="info-section">
          <div className="section-title">PRODUCTION DETAILS</div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">PRIMARY OPERATOR</div>
              <div className="info-value">{batch.primaryOperator || '_________________'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">PRODUCTION LINE</div>
              <div className="info-value">{batch.productionLine || '_________________'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">SHIFT</div>
              <div className="info-value">{batch.shift || '_________________'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">PLANNED START</div>
              <div className="info-value">{formatDate(batch.plannedStartTime)}</div>
            </div>
          </div>
          
          {batch.assistantOperators.length > 0 && (
            <div className="mt-4">
              <div className="info-label">ASSISTANT OPERATORS:</div>
              <div className="info-value">{batch.assistantOperators.join(', ')}</div>
            </div>
          )}
        </div>

        {/* Ingredients */}
        <div className="info-section">
          <div className="section-title">INGREDIENT LOTS USED</div>
          {batch.batchIngredients.length > 0 ? (
            <table className="ingredients-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Lot Code</th>
                  <th>Supplier</th>
                  <th>Quantity</th>
                  <th>Allergens</th>
                  <th>Verification ✓</th>
                </tr>
              </thead>
              <tbody>
                {batch.batchIngredients.map((ingredient) => (
                  <tr key={ingredient.id}>
                    <td className="font-medium">{ingredient.ingredient.name}</td>
                    <td>{ingredient.ingredientLot.lotCode}</td>
                    <td>{ingredient.ingredientLot.supplierName}</td>
                    <td>{ingredient.quantityUsed} {ingredient.unitOfMeasure}</td>
                    <td>
                      {ingredient.ingredient.allergens.length > 0 
                        ? ingredient.ingredient.allergens.map(allergen => (
                            <span key={allergen} className={`allergen-badge ${allergen.includes('GLUTEN') || allergen.includes('NUTS') ? 'critical-badge' : ''}`}>
                              {allergen}
                            </span>
                          ))
                        : 'None'
                      }
                    </td>
                    <td style={{ width: '60px' }}>
                      <div className="checkbox"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No ingredient lots recorded. Complete after production start.
            </div>
          )}
        </div>

        {/* Production Steps Checklist */}
        <div className="info-section">
          <div className="section-title">PRODUCTION CHECKLIST</div>
          <div className="checklist">
            {productionSteps.map((step, index) => (
              <div key={index} className="checklist-item">
                <div className="checkbox"></div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Control Checklist */}
        <div className="info-section page-break">
          <div className="section-title">QUALITY CONTROL CHECKLIST</div>
          <div className="checklist">
            {qualityCheckSteps.map((step, index) => (
              <div key={index} className="checklist-item">
                <div className="checkbox"></div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Conditions */}
        <div className="info-section">
          <div className="section-title">ENVIRONMENTAL CONDITIONS</div>
          <div className="info-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="info-item">
              <div className="info-label">TEMPERATURE (°C)</div>
              <div className="info-value">{batch.temperature || '_____'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">HUMIDITY (%)</div>
              <div className="info-value">{batch.humidity || '_____'}</div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="info-section">
          <div className="section-title">PRODUCTION NOTES</div>
          <div style={{ minHeight: '100px', border: '1px solid #ccc', padding: '10px' }}>
            {batch.productionNotes || 'No special notes recorded.'}
          </div>
        </div>

        {/* Signatures */}
        <div className="signature-section">
          <div className="section-title">APPROVALS & SIGNATURES</div>
          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <div className="info-label">PRODUCTION OPERATOR</div>
              <div className="signature-line"></div>
              <div className="text-sm mt-1">Signature & Date</div>
            </div>
            <div>
              <div className="info-label">QUALITY INSPECTOR</div>
              <div className="signature-line"></div>
              <div className="text-sm mt-1">Signature & Date</div>
            </div>
            <div>
              <div className="info-label">SUPERVISOR</div>
              <div className="signature-line"></div>
              <div className="text-sm mt-1">Signature & Date</div>
            </div>
            <div>
              <div className="info-label">FINAL APPROVAL</div>
              <div className="signature-line"></div>
              <div className="text-sm mt-1">Signature & Date</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs mt-8 pt-4 border-t border-gray-300">
          <div>BakerMaiden Production Tracking System</div>
          <div>This document is part of our HACCP and traceability compliance program</div>
          <div className="mt-2">
            <strong>IMPORTANT:</strong> This sheet must be completed and signed before batch completion.
            Retain for regulatory compliance and traceability records.
          </div>
        </div>
      </div>
    </div>
  );
}
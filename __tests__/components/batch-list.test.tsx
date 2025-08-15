/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BatchList } from '@/components/forms/batch-list';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

const mockProductionRuns = [
  {
    id: 1,
    batchNumber: 'BATCH-001',
    dailyLot: 'DL-001',
    cakeLot: 'CL-001',
    icingLot: 'IL-001',
    plannedQuantity: 100,
    actualQuantity: 95,
    unitOfMeasure: 'units',
    status: 'COMPLETED',
    qualityStatus: 'PASSED',
    primaryOperator: 'John Smith',
    productionLine: 'Line A',
    shift: 'Day',
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T14:00:00Z',
    recipe: {
      id: 1,
      name: 'Chocolate Cake'
    },
    pallets: [
      {
        id: 1,
        palletNumber: 'P-001',
        status: 'SHIPPED'
      }
    ],
    _count: {
      pallets: 1
    }
  },
  {
    id: 2,
    batchNumber: 'BATCH-002',
    dailyLot: 'DL-002',
    cakeLot: 'CL-002',
    icingLot: 'IL-002',
    plannedQuantity: 150,
    actualQuantity: null,
    unitOfMeasure: 'units',
    status: 'IN_PROGRESS',
    qualityStatus: 'PENDING',
    primaryOperator: 'Jane Doe',
    productionLine: 'Line B',
    shift: 'Evening',
    createdAt: '2023-01-02T10:00:00Z',
    updatedAt: '2023-01-02T10:00:00Z',
    recipe: {
      id: 2,
      name: 'Vanilla Cake'
    },
    pallets: [],
    _count: {
      pallets: 0
    }
  }
];

describe('BatchList Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProductionRuns })
    });
  });

  it('renders loading state initially', async () => {
    render(<BatchList />);
    
    expect(screen.getByText('Loading production runs...')).toBeInTheDocument();
  });

  it('renders production runs after loading', async () => {
    render(<BatchList />);
    
    // Wait for the API call and data to load
    await waitFor(() => {
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
      expect(screen.getByText('BATCH-002')).toBeInTheDocument();
    });
    
    // Check that the correct data is displayed
    expect(screen.getByText('Chocolate Cake')).toBeInTheDocument();
    expect(screen.getByText('Vanilla Cake')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('displays correct status badges', async () => {
    render(<BatchList />);
    
    await waitFor(() => {
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
      expect(screen.getByText('PASSED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
    });
  });

  it('displays yield information correctly', async () => {
    render(<BatchList />);
    
    await waitFor(() => {
      // BATCH-001 has actual quantity, should show yield
      expect(screen.getByText('95.0%')).toBeInTheDocument();
      // BATCH-002 has no actual quantity, should show N/A
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  it('calls onViewDetails when view button is clicked', async () => {
    const mockOnViewDetails = jest.fn();
    render(<BatchList onViewDetails={mockOnViewDetails} />);
    
    await waitFor(() => {
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
    });
    
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);
    
    expect(mockOnViewDetails).toHaveBeenCalledWith(1);
  });

  it('calls onPrintBatchSheet when print button is clicked', async () => {
    const mockOnPrintBatchSheet = jest.fn();
    render(<BatchList onPrintBatchSheet={mockOnPrintBatchSheet} />);
    
    await waitFor(() => {
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
    });
    
    const printButtons = screen.getAllByText('Print');
    fireEvent.click(printButtons[0]);
    
    expect(mockOnPrintBatchSheet).toHaveBeenCalledWith(1);
  });

  it('calls onCreateNew when "Start New Run" button is clicked', async () => {
    const mockOnCreateNew = jest.fn();
    render(<BatchList onCreateNew={mockOnCreateNew} />);
    
    await waitFor(() => {
      expect(screen.getByText('Start New Run')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Start New Run'));
    expect(mockOnCreateNew).toHaveBeenCalled();
  });

  it('filters production runs by search term', async () => {
    render(<BatchList />);
    
    await waitFor(() => {
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
      expect(screen.getByText('BATCH-002')).toBeInTheDocument();
    });
    
    // Search for "Chocolate"
    const searchInput = screen.getByPlaceholderText('Search batch, lot, recipe, or operator...');
    fireEvent.change(searchInput, { target: { value: 'Chocolate' } });
    
    // Should show only the chocolate cake batch
    await waitFor(() => {
      expect(screen.getByText('BATCH-001')).toBeInTheDocument();
      expect(screen.queryByText('BATCH-002')).not.toBeInTheDocument();
    });
  });

  it('displays summary statistics correctly', async () => {
    render(<BatchList />);
    
    await waitFor(() => {
      // Total runs
      expect(screen.getByText('2')).toBeInTheDocument();
      // In progress (BATCH-002)
      expect(screen.getByText('1')).toBeInTheDocument();
      // Completed (BATCH-001)
      expect(screen.getByText('1')).toBeInTheDocument();
      // Total pallets
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<BatchList />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load production runs')).toBeInTheDocument();
    });
  });

  it('shows empty state when no production runs exist', async () => {
    // Mock empty response
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });
    
    render(<BatchList />);
    
    await waitFor(() => {
      expect(screen.getByText('No production runs found matching your filters.')).toBeInTheDocument();
    });
  });
});

// Test for component accessibility
describe('BatchList Accessibility', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProductionRuns })
    });
  });

  it('has proper ARIA labels and roles', async () => {
    render(<BatchList />);
    
    await waitFor(() => {
      // Check that the table has proper structure
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(10);
    });
  });

  it('supports keyboard navigation', async () => {
    render(<BatchList onViewDetails={jest.fn()} />);
    
    await waitFor(() => {
      const viewButton = screen.getAllByText('View')[0];
      expect(viewButton).toBeInTheDocument();
      
      // Button should be focusable
      viewButton.focus();
      expect(viewButton).toHaveFocus();
    });
  });
});
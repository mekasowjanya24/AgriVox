import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '../i18n/index.js';
import { Prices } from '../pages/Prices.jsx';

// Mock contexts
vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Ravi', storageCostPerQuintalPerDay: 2 },
  }),
}));

vi.mock('../context/SyncContext.jsx', () => ({
  useSync: () => ({
    isOnline: true,
  }),
}));

// Mock recharts to avoid jsdom sizing issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
  ComposedChart: ({ children }) => <div data-testid="composed-chart">{children}</div>,
  Line: () => <div data-testid="chart-line" />,
  Area: () => <div data-testid="chart-area" />,
  XAxis: () => <div data-testid="chart-xaxis" />,
  YAxis: () => <div data-testid="chart-yaxis" />,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  Legend: () => <div data-testid="chart-legend" />,
}));

// Mock API client
vi.mock('../api/client.js', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../api/client.js';

describe('Prices Page Client Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders successfully with mocked API data and preselects first valid combination', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/prices/meta')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              commodities: ['Paddy', 'Cotton', 'Chilli'],
              markets: ['Warangal', 'Khammam'],
              combinations: {
                Paddy: ['Warangal', 'Khammam'],
                Cotton: ['Warangal', 'Khammam'],
                Chilli: ['Warangal', 'Khammam'],
              },
            },
          },
        });
      }
      if (url.includes('/prices?')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { date: '2026-10-10', modalPrice: 2200 },
              { date: '2026-10-11', modalPrice: 2250 },
            ],
          },
        });
      }
      if (url.includes('/prices/forecast')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              commodity: 'Paddy',
              market: 'Warangal',
              points: [
                { date: '2026-10-15', predicted: 2280, lower: 2200, upper: 2360 },
              ],
              mape: 3.5,
              model: 'holt-winters',
            },
          },
        });
      }
      if (url.includes('/prices/advisor')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              action: 'WAIT',
              waitDays: 7,
              currentPrice: 2250,
              bestPrice: 2400,
              expectedGainPerQuintal: 150,
              expectedTotalGain: 7500,
              confidence: 'High',
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<Prices />);

    // Dropdowns must exist and have options
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2);
      // First select is commodity, second is market
      expect(selects[0].value).toBe('Paddy');
      expect(selects[1].value).toBe('Warangal');
    });

    // Options must be filled
    const cropSelect = screen.getAllByRole('combobox')[0];
    const cropOptions = Array.from(cropSelect.querySelectorAll('option')).map((o) => o.value);
    expect(cropOptions).toContain('Paddy');
    expect(cropOptions).toContain('Cotton');
    expect(cropOptions).toContain('Chilli');

    const marketSelect = screen.getAllByRole('combobox')[1];
    const marketOptions = Array.from(marketSelect.querySelectorAll('option')).map((o) => o.value);
    expect(marketOptions).toContain('Warangal');
    expect(marketOptions).toContain('Khammam');

    // Chart and advisor cards must render
    await waitFor(() => {
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  it('falls back to default combinations when metadata response is empty', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/prices/meta')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              commodities: [],
              markets: [],
              combinations: {},
            },
          },
        });
      }
      // Empty prices
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(<Prices />);

    // Dropdowns must still have options from DEFAULT_COMMODITIES and not stay blank
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2);
      const cropOptions = Array.from(selects[0].querySelectorAll('option')).map((o) => o.value);
      expect(cropOptions.length).toBeGreaterThan(0);
      expect(cropOptions).toContain('Paddy');
      expect(cropOptions).toContain('Cotton');
    });

    // Friendly empty state is shown, without raw errors
    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/500/i)).not.toBeInTheDocument();
    });
  });

  it('handles failing API responses gracefully with a friendly Try Again button and no raw errors', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/prices/meta')) {
        return Promise.reject(new Error('Network Error 500 Connection Refused'));
      }
      if (url.includes('/prices')) {
        return Promise.reject(new Error('Internal Server Error 500'));
      }
      return Promise.reject(new Error('Failed to load'));
    });

    render(<Prices />);

    // Dropdowns must NOT be blank even when meta call fails completely
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2);
      expect(selects[0].value).toBeTruthy();
      expect(selects[1].value).toBeTruthy();
    });

    // Friendly "Try Again" / retry button must appear
    await waitFor(() => {
      const retryButtons = screen.getAllByRole('button');
      const hasRetry = retryButtons.some(
        (btn) => btn.textContent.includes('Try Again') || btn.textContent.includes('ప్రయత్నించండి')
      );
      expect(hasRetry).toBe(true);
    });

    // Must NEVER show raw unhandled error text to farmer
    expect(screen.queryByText(/Network Error 500 Connection Refused/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal Server Error 500/i)).not.toBeInTheDocument();
  });
});

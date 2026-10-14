import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { formatBilingualText } from '../utils/formatters.js';
import {
  TrendingUp,
  Clock,
  Sparkles,
  Sliders,
  DollarSign,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

const DEFAULT_COMMODITIES = ['Paddy', 'Cotton', 'Chilli', 'Maize', 'Red Gram', 'Turmeric'];
const DEFAULT_COMBINATIONS = {
  Paddy: ['Warangal', 'Khammam'],
  Cotton: ['Warangal', 'Khammam'],
  Chilli: ['Warangal', 'Khammam'],
  Maize: ['Warangal', 'Khammam'],
  'Red Gram': ['Warangal', 'Khammam'],
  Turmeric: ['Warangal', 'Khammam'],
};

export const Prices = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isOnline } = useSync();

  const [meta, setMeta] = useState({
    commodities: DEFAULT_COMMODITIES,
    markets: ['Warangal', 'Khammam'],
    combinations: DEFAULT_COMBINATIONS,
  });
  const [commodity, setCommodity] = useState('Paddy');
  const [market, setMarket] = useState('Warangal');

  const [priceHistory, setPriceHistory] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [advisor, setAdvisor] = useState(null);

  // Storage cost and quantity inputs
  const [storageCost, setStorageCost] = useState(user?.storageCostPerQuintalPerDay || 2);
  const [quantity, setQuantity] = useState(50);

  const [loading, setLoading] = useState(true);
  const [metaError, setMetaError] = useState(false);
  const [priceError, setPriceError] = useState(false);

  // 1. Fetch metadata with actual data combinations
  const fetchMeta = async () => {
    setMetaError(false);
    try {
      const res = await api.get('/prices/meta');
      const metaData = res.data?.data || {};
      const comms = Array.isArray(metaData.commodities) && metaData.commodities.length > 0
        ? metaData.commodities
        : DEFAULT_COMMODITIES;
      const combos = metaData.combinations && Object.keys(metaData.combinations).length > 0
        ? metaData.combinations
        : DEFAULT_COMBINATIONS;

      setMeta({
        commodities: comms,
        markets: metaData.markets || ['Warangal', 'Khammam'],
        combinations: combos,
      });

      // Ensure valid crop and market preselected
      setCommodity((prevComm) => {
        const selectedCrop = comms.includes(prevComm) ? prevComm : comms[0];
        const validMkts = combos[selectedCrop] || ['Warangal', 'Khammam'];
        setMarket((prevMkt) => (validMkts.includes(prevMkt) ? prevMkt : validMkts[0]));
        return selectedCrop;
      });
    } catch (err) {
      console.warn('Price meta error:', err);
      setMetaError(true);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const handleCommodityChange = (newComm) => {
    setCommodity(newComm);
    const validMkts = meta.combinations?.[newComm] || DEFAULT_COMBINATIONS[newComm] || ['Warangal'];
    if (!validMkts.includes(market)) {
      setMarket(validMkts[0]);
    }
  };

  // 2. Fetch price history and 14-day ML forecast on commodity/market change
  const loadPriceAndForecast = async () => {
    if (!commodity || !market) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPriceError(false);

    try {
      const [historyResult, forecastResult] = await Promise.allSettled([
        api.get(`/prices?commodity=${encodeURIComponent(commodity)}&market=${encodeURIComponent(market)}&limit=60`),
        api.get(`/prices/forecast?commodity=${encodeURIComponent(commodity)}&market=${encodeURIComponent(market)}&horizon=14`),
      ]);

      const historyData = historyResult.status === 'fulfilled' ? (historyResult.value.data?.data || []) : [];
      const forecastData = forecastResult.status === 'fulfilled' ? (forecastResult.value.data?.data || null) : null;

      if (historyResult.status === 'rejected' && forecastResult.status === 'rejected') {
        console.warn('Both price history and forecast failed:', historyResult.reason, forecastResult.reason);
        setPriceError(true);
        setPriceHistory([]);
        setForecast(null);
        setAdvisor(null);
      } else {
        setPriceHistory(historyData);
        setForecast(forecastData);
        setPriceError(false);
      }
    } catch (err) {
      console.warn('Price data loading error:', err);
      // Never crash or show raw error; record error state for retry UI
      setPriceError(true);
      setPriceHistory([]);
      setForecast(null);
      setAdvisor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriceAndForecast();
  }, [commodity, market]);

  // 3. Fetch advisor when commodity/market/storageCost/quantity changes (debounced 250ms)
  useEffect(() => {
    if (!commodity || !market) {
      setAdvisor(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const advisorRes = await api.get(
          `/prices/advisor?commodity=${encodeURIComponent(commodity)}&market=${encodeURIComponent(market)}&quantity=${quantity}&storageCost=${storageCost}`
        );
        setAdvisor(advisorRes.data?.data || null);
      } catch (err) {
        setAdvisor(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [commodity, market, storageCost, quantity]);

  // Merge history and forecast into a unified chart dataset
  const chartData = [];
  // Last 30 history points
  const recentHistory = priceHistory.slice(-30);
  recentHistory.forEach((p) => {
    chartData.push({
      date: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      actualPrice: p.modalPrice,
      predictedPrice: null,
      lowerBound: null,
      upperBound: null,
    });
  });

  // Append 14 forecast points
  if (forecast && forecast.points) {
    forecast.points.forEach((pt) => {
      chartData.push({
        date: new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        actualPrice: null,
        predictedPrice: pt.predicted,
        lowerBound: pt.lower,
        upperBound: pt.upper,
      });
    });
  }

  const formatINR = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  const validMarkets = meta.combinations?.[commodity] || [];
  const hasPriceData = priceHistory.length > 0 || (forecast && forecast.points && forecast.points.length > 0);

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Title */}
      <div className="pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-agri-700" />
          {t('prices.title')}
        </h1>
      </div>

      {/* Meta retry banner if metadata call fails */}
      {metaError && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{t('prices.loadError', 'Failed to load price data')}</span>
          </div>
          <button
            type="button"
            onClick={fetchMeta}
            className="font-bold underline text-amber-950 ml-2 hover:text-amber-800"
          >
            {t('common.retry', 'Try Again')}
          </button>
        </div>
      )}

      {/* Selectors: Commodity & Market */}
      <div className="card-farmer bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-earth-700 uppercase mb-1">
              {t('prices.selectCommodity')}
            </label>
            <select
              value={commodity}
              onChange={(e) => handleCommodityChange(e.target.value)}
              className="input-farmer"
              disabled={meta.commodities.length === 0}
            >
              {meta.commodities.map((c) => (
                <option key={c} value={c}>
                  {formatBilingualText(c, i18n.language)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-earth-700 uppercase mb-1">
              {t('prices.selectMarket')}
            </label>
            <select
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="input-farmer"
              disabled={validMarkets.length === 0}
            >
              {validMarkets.map((m) => (
                <option key={m} value={m}>
                  {formatBilingualText(m, i18n.language)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card-farmer bg-white p-8 text-center border border-cream-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 mx-auto mb-2 border-3 border-agri-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-earth-600 font-medium">{t('common.loading', 'Loading...')}</p>
        </div>
      )}

      {/* Friendly Error with Retry Button (Requirement 4) */}
      {priceError && !loading && (
        <div className="card-farmer bg-white p-6 text-center border border-amber-200 rounded-2xl shadow-sm">
          <div className="w-12 h-12 mx-auto mb-3 bg-amber-50 rounded-full flex items-center justify-center text-amber-700">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-earth-900 mb-1">
            {t('prices.loadError', 'Failed to load price data')}
          </h3>
          <p className="text-xs text-earth-600 mb-4 max-w-xs mx-auto">
            {t('prices.noPricesSub')}
          </p>
          <button
            type="button"
            onClick={loadPriceAndForecast}
            className="btn-farmer inline-flex items-center gap-2 px-5 py-2.5 bg-agri-700 text-white rounded-xl text-sm font-bold shadow hover:bg-agri-800"
          >
            {t('common.retry', 'Try Again')}
          </button>
        </div>
      )}

      {/* Friendly empty state if no prices for crop and market yet */}
      {!loading && !priceError && !hasPriceData && (
        <div className="card-farmer bg-white p-8 text-center border border-cream-200 rounded-2xl shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 bg-agri-50 rounded-full flex items-center justify-center text-agri-700">
            <TrendingUp className="w-7 h-7 opacity-75" />
          </div>
          <h3 className="text-base font-bold text-earth-900 mb-1">
            {t('prices.noPricesYet')}
          </h3>
          <p className="text-xs text-earth-600 max-w-xs mx-auto">
            {t('prices.noPricesSub')}
          </p>
        </div>
      )}

      {/* SMART SELL ADVISOR CARD (SRS FR-ADV-01) */}
      {hasPriceData && advisor && (
        <div
          className={`card-farmer border-2 p-5 shadow-md ${
            advisor.action === 'WAIT'
              ? 'bg-amber-50/70 border-amber-400'
              : 'bg-green-50/70 border-green-500'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles
                className={`w-5 h-5 ${
                  advisor.action === 'WAIT' ? 'text-amber-700' : 'text-green-700'
                }`}
              />
              <h2 className="text-lg font-bold text-earth-900">
                {t('advisor.title')}
              </h2>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                advisor.confidence === 'High'
                  ? 'bg-green-100 text-green-900 border-green-300'
                  : advisor.confidence === 'Medium'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-gray-100 text-gray-800 border-gray-300'
              }`}
            >
              {advisor.confidence === 'High'
                ? t('advisor.confidenceHigh')
                : advisor.confidence === 'Medium'
                ? t('advisor.confidenceMedium')
                : t('advisor.confidenceLow')}
            </span>
          </div>

          {/* Large Action Recommendation Banner */}
          <div
            className={`p-4 rounded-xl text-center mb-4 border ${
              advisor.action === 'WAIT'
                ? 'bg-amber-100/80 border-amber-300 text-amber-950'
                : 'bg-green-100/80 border-green-300 text-green-950'
            }`}
          >
            <div className="text-xs uppercase font-extrabold tracking-wider opacity-75">
              {t('advisor.recommendation')}
            </div>
            <div className="text-2xl font-black mt-1">
              {advisor.action === 'WAIT'
                ? t('advisor.waitDays', { days: advisor.waitDays })
                : t('advisor.sellNow')}
            </div>

            {advisor.action === 'WAIT' && (
              <div className="text-sm font-semibold mt-1 text-amber-900">
                {t('prices.extraGainPerQtl', { amount: formatINR(advisor.expectedGainPerQuintal) })}
              </div>
            )}
          </div>

          {/* Pricing Details */}
          <div className="grid grid-cols-2 gap-3 text-sm bg-white/80 p-3 rounded-xl border border-cream-200 mb-4">
            <div>
              <span className="text-xs text-earth-600 block">
                {t('advisor.currentPrice')}
              </span>
              <span className="font-bold text-base text-earth-900">
                {formatINR(advisor.currentPrice)} / Qtl
              </span>
            </div>

            <div>
              <span className="text-xs text-earth-600 block">
                {t('advisor.expectedBestPrice')}
              </span>
              <span className="font-bold text-base text-agri-800">
                {formatINR(advisor.bestPrice)} / Qtl
              </span>
            </div>

            {advisor.action === 'WAIT' && (
              <div className="col-span-2 pt-2 border-t border-cream-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-earth-700">
                  {t('prices.totalGainForStock', { qty: quantity })}
                </span>
                <span className="font-extrabold text-base text-agri-700">
                  +{formatINR(advisor.expectedTotalGain)}
                </span>
              </div>
            )}
          </div>

          {/* Interactive Storage Cost & Quantity Form (FR-ADV-01 acceptance criteria) */}
          <div className="bg-white/60 p-3 rounded-xl border border-cream-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-earth-800">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-earth-600" />
                {t('advisor.storageCostPerDay')}
              </span>
              <span className="text-amber-800 font-extrabold">₹ {storageCost}</span>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={storageCost}
              onChange={(e) => setStorageCost(parseFloat(e.target.value))}
              className="w-full accent-amber-700 h-2 bg-cream-200 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="text-xs font-bold text-earth-700">
                {t('advisor.quantityQuintals')}:
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-farmer w-24 min-h-[40px] py-1 text-center font-bold text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* 14-DAY FORECAST & PRICE TREND CHART */}
      {hasPriceData && (
        <div className="card-farmer bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-earth-900">
                {t('prices.forecast14Days')}
              </h2>
              {forecast && (
                <p className="text-xs text-earth-500">
                  {t('prices.mapeAccuracy')}: {forecast.mape}% ({forecast.model})
                </p>
              )}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4f3f2d' }} interval={4} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#4f3f2d' }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip formatter={(value) => (value ? formatINR(value) : null)} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                {/* Confidence interval band */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  fill="#d8f3dc"
                  stroke="none"
                  name={t('prices.forecastBand')}
                />
                {/* Forecast line */}
                <Line
                  type="monotone"
                  dataKey="predictedPrice"
                  stroke="#2d6a4f"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  name={t('prices.predictedPrice')}
                  dot={{ r: 2 }}
                />
                {/* Actual price line */}
                <Line
                  type="monotone"
                  dataKey="actualPrice"
                  stroke="#b45309"
                  strokeWidth={2}
                  name={t('prices.modalPrice')}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

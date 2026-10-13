import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import { formatBilingualText } from '../utils/formatters.js';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  PlusCircle,
  MapPin,
  Sprout,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isOnline } = useSync();

  const [summary, setSummary] = useState({
    totalExpense: 0,
    totalRevenue: 0,
    netProfit: 0,
    profitPerAcre: 0,
    totalArea: 0,
  });

  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [seasonComparison, setSeasonComparison] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard data from server if online, or calculate from local IndexedDB if offline
  const loadData = useCallback(async () => {
    try {
      if (isOnline) {
        const [sumRes, catRes, seasonRes, expRes] = await Promise.all([
          api.get('/analytics/summary'),
          api.get('/analytics/expense-breakdown'),
          api.get('/analytics/season-comparison'),
          api.get('/expenses?limit=5'),
        ]);

        setSummary(sumRes.data.data);
        setCategoryBreakdown(catRes.data.data);
        setSeasonComparison(seasonRes.data.data);
        setRecentExpenses(expRes.data.data);
      } else {
        // Offline calculation from Dexie IndexedDB
        const [localExpenses, localHarvests, localPlots, localCycles] = await Promise.all([
          db.expenses.toArray(),
          db.harvests.toArray(),
          db.plots.toArray(),
          db.cycles.toArray(),
        ]);

        const totalExpense = localExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalRevenue = localHarvests.reduce((sum, h) => sum + ((h.quantityQuintals || 0) * (h.pricePerQuintal || 0)), 0);
        const totalArea = localPlots.reduce((sum, p) => sum + (p.areaAcres || 0), 0) || 1;
        const netProfit = totalRevenue - totalExpense;
        const profitPerAcre = totalArea > 0 ? netProfit / totalArea : netProfit;

        setSummary({
          totalExpense,
          totalRevenue,
          netProfit,
          profitPerAcre: Math.round(profitPerAcre * 100) / 100,
          totalArea,
        });

        // Group categories
        const catMap = {};
        localExpenses.forEach((e) => {
          catMap[e.category] = (catMap[e.category] || 0) + (e.amount || 0);
        });
        setCategoryBreakdown(Object.entries(catMap).map(([category, total]) => ({ category, total })));

        setRecentExpenses(localExpenses.slice(-5).reverse());
      }
    } catch (err) {
      console.warn('Dashboard load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    loadData();

    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [loadData]);

  const formatINR = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  const CATEGORY_COLORS = {
    seeds: '#2d6a4f',
    fertilizer: '#40916c',
    pesticide: '#52b788',
    labour: '#b45309',
    irrigation: '#0284c7',
    machinery: '#d97706',
    transport: '#854d0e',
    other: '#71717a',
  };

  const hasData = summary.totalExpense > 0 || summary.totalRevenue > 0;
  const displayName = formatBilingualText(user?.name, i18n.language) || (i18n.language === 'te' ? 'రైతు' : 'Farmer');

  return (
    <div className="space-y-6 pb-6">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-earth-900">
            {t('dashboard.greeting', { name: displayName })}
          </h1>
          <p className="text-earth-600 text-sm mt-0.5">
            {t('dashboard.overviewTitle')}
          </p>
        </div>
        <button
          onClick={loadData}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-cream-100 text-earth-700 hover:bg-cream-200 border border-cream-300"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Empty State */}
      {!loading && !hasData && (
        <div className="card-farmer text-center py-10 px-6 border-dashed border-2 border-agri-200 bg-agri-50/50">
          <div className="w-16 h-16 rounded-full bg-agri-100 text-agri-800 flex items-center justify-center mx-auto mb-4">
            <Sprout className="w-9 h-9 text-agri-700" />
          </div>
          <h2 className="text-xl font-bold text-earth-900 mb-2">
            {t('dashboard.noDataYet')}
          </h2>
          <p className="text-earth-600 text-sm max-w-sm mx-auto mb-6">
            {t('dashboard.emptySubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/plots/new" className="btn-secondary">
              <MapPin className="w-5 h-5 mr-2 text-earth-700" />
              {t('dashboard.addFirstPlot')}
            </Link>
            <Link to="/expenses/add" className="btn-primary">
              <PlusCircle className="w-5 h-5 mr-2" />
              {t('dashboard.addFirstExpense')}
            </Link>
          </div>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Net Profit Card */}
        <div className="card-farmer bg-white border-l-4 border-l-agri-700 p-4 shadow-sm col-span-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-earth-600 mb-1">
            <span>{t('dashboard.totalProfit')}</span>
            <TrendingUp className="w-4 h-4 text-agri-700" />
          </div>
          <div
            className={`text-3xl font-extrabold tracking-tight ${
              summary.netProfit >= 0 ? 'text-agri-800' : 'text-red-700'
            }`}
          >
            {formatINR(summary.netProfit)}
          </div>
          <div className="text-sm text-earth-600 mt-1 flex items-center gap-1">
            <span className="font-semibold text-earth-800">
              {formatINR(summary.profitPerAcre)}
            </span>
            <span>/ {t('common.acres')}</span>
          </div>
        </div>

        {/* Revenue Card */}
        <div className="card-farmer bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-earth-600 mb-1">
            {t('dashboard.totalRevenue')}
          </div>
          <div className="text-xl font-bold text-agri-700">
            {formatINR(summary.totalRevenue)}
          </div>
        </div>

        {/* Expense Card */}
        <div className="card-farmer bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-earth-600 mb-1">
            {t('dashboard.totalExpenses')}
          </div>
          <div className="text-xl font-bold text-amber-800">
            {formatINR(summary.totalExpense)}
          </div>
        </div>
      </div>

      {/* Quick Action Button for Voice Expense */}
      <Link
        to="/expenses/add"
        className="w-full flex items-center justify-between p-4 bg-agri-800 hover:bg-agri-900 active:scale-[0.99] text-white rounded-2xl shadow-md transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-agri-700/80 flex items-center justify-center">
            <PlusCircle className="w-7 h-7 text-agri-200" />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg text-cream-50 leading-tight">
              {t('expenses.title')}
            </div>
            <div className="text-xs text-agri-200 font-medium">
              {t('expenses.speakPrompt')}
            </div>
          </div>
        </div>
        <ArrowRight className="w-6 h-6 text-agri-300" />
      </Link>

      {/* Expense Breakdown Pie Chart */}
      {categoryBreakdown.length > 0 && (
        <div className="card-farmer bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-earth-900 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-agri-700" />
              {t('dashboard.expenseBreakdown')}
            </h2>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={35}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    `${t(`categories.${name}`, { defaultValue: name })}: ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.category] || '#64748b'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [formatINR(value), t('dashboard.totalExpenses')]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Season Comparison Bar Chart */}
      {seasonComparison.length > 0 && (
        <div className="card-farmer bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-earth-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-agri-700" />
              {t('dashboard.seasonComparison')}
            </h2>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={seasonComparison.map(sc => ({
                  ...sc,
                  cropName: formatBilingualText(sc.crop, i18n.language)
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis
                  dataKey="cropName"
                  tick={{ fontSize: 12, fill: '#4f3f2d' }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#4f3f2d' }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip formatter={(val) => formatINR(val)} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name={t('dashboard.totalRevenue')} fill="#2b7847" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name={t('dashboard.totalExpenses')} fill="#b45309" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Logged Expenses */}
      {recentExpenses.length > 0 && (
        <div className="card-farmer bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-earth-900">
              {t('dashboard.recentEntries')}
            </h2>
            <Link
              to="/cycles"
              className="text-xs font-bold text-agri-800 hover:underline"
            >
              {t('common.search')}
            </Link>
          </div>

          <div className="divide-y divide-cream-200">
            {recentExpenses.map((exp, idx) => (
              <div key={exp._id || idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-earth-900 text-base">
                    {formatBilingualText(exp.item, i18n.language)}
                  </div>
                  <div className="text-xs text-earth-600 flex items-center gap-2">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-cream-100 text-earth-700 border border-cream-200">
                      {t(`categories.${exp.category}`, { defaultValue: exp.category })}
                    </span>
                    <span>{new Date(exp.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-base font-bold text-amber-800">
                  {formatINR(exp.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

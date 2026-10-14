import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import { formatBilingualText } from '../utils/formatters.js';
import { FileText, Download, Check, AlertCircle, Calendar, Sprout, TrendingUp } from 'lucide-react';

export const Reports = () => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useSync();

  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [cycleAnalytics, setCycleAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const loadCycles = async () => {
      try {
        if (isOnline) {
          const res = await api.get('/cycles');
          const list = res.data.data || [];
          setCycles(list);
          if (list.length > 0) setSelectedCycleId(list[0]._id);
        } else {
          const localList = await db.cycles.toArray();
          setCycles(localList);
          if (localList.length > 0) setSelectedCycleId(localList[0]._id || localList[0].clientId);
        }
      } catch (err) {
        console.warn('Error loading cycles:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCycles();
  }, [isOnline]);

  useEffect(() => {
    if (!selectedCycleId) return;

    const loadAnalytics = async () => {
      try {
        if (isOnline) {
          const res = await api.get(`/analytics/cycle/${selectedCycleId}`);
          setCycleAnalytics(res.data.data);
        }
      } catch (err) {
        console.warn('Error loading cycle analytics:', err);
      }
    };
    loadAnalytics();
  }, [selectedCycleId, isOnline]);

  const handleDownload = async () => {
    if (!isOnline) {
      alert(t('reports.pdfRequiresInternet'));
      return;
    }
    if (!selectedCycleId) return;

    setDownloading(true);
    try {
      const response = await api.get(`/reports/cycle/${selectedCycleId}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AgriVox_Cycle_Report_${selectedCycleId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(t('reports.pdfFailed') + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const formatINR = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-agri-700" />
          {t('reports.title')}
        </h1>
      </div>

      {loading ? (
        <div className="card-farmer bg-white p-8 text-center border border-cream-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 mx-auto mb-2 border-3 border-agri-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-earth-600 font-medium">{t('common.loading')}</p>
        </div>
      ) : cycles.length === 0 ? (
        <div className="card-farmer text-center py-10 px-4 bg-white border border-cream-200 rounded-2xl">
          <FileText className="w-12 h-12 text-agri-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-earth-900 mb-1">{t('reports.noCycles')}</h3>
          <p className="text-sm text-earth-600 mb-4">{t('dashboard.emptySubtitle')}</p>
          <a href="/cycles/new" className="btn-primary inline-flex items-center justify-center">
            <span>{t('expenses.startNewCrop')}</span>
          </a>
        </div>
      ) : (
        <div className="card-farmer bg-white p-4">
          <label className="block text-xs font-bold text-earth-700 uppercase mb-1.5">
            {t('reports.selectCycle')}
          </label>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="input-farmer"
          >
            {cycles.map((c) => (
              <option key={c._id || c.clientId} value={c._id || c.clientId}>
                {formatBilingualText(c.crop, i18n.language)} ({formatBilingualText(c.season, i18n.language)} {c.year}) - {formatBilingualText(c.plotId?.name, i18n.language) || (i18n.language === 'te' ? 'పొలం' : 'Plot')}
              </option>
            ))}
          </select>
        </div>
      )}

      {cycleAnalytics && (
        <div className="card-farmer bg-white p-5 space-y-4 shadow-sm border border-cream-200">
          <div className="flex items-center justify-between pb-3 border-b border-cream-100">
            <div>
              <h2 className="text-xl font-bold text-earth-900">
                {formatBilingualText(cycleAnalytics.crop, i18n.language)}
              </h2>
              <p className="text-xs text-earth-600 mt-0.5">
                {formatBilingualText(cycleAnalytics.season, i18n.language)} {cycleAnalytics.year} • {formatBilingualText(cycleAnalytics.plotName, i18n.language)} ({cycleAnalytics.plotArea} {t('common.acres')})
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
              {t(`cycles.${(cycleAnalytics.status || 'active').toLowerCase()}`, { defaultValue: cycleAnalytics.status })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
              <span className="text-xs text-earth-600 block">{t('dashboard.totalExpenses')}</span>
              <span className="text-lg font-bold text-amber-800">{formatINR(cycleAnalytics.totalExpense)}</span>
            </div>

            <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
              <span className="text-xs text-earth-600 block">{t('dashboard.totalRevenue')}</span>
              <span className="text-lg font-bold text-agri-700">{formatINR(cycleAnalytics.totalRevenue)}</span>
            </div>

            <div className="col-span-2 p-3 bg-agri-50 rounded-xl border border-agri-200 flex justify-between items-center">
              <div>
                <span className="text-xs text-agri-800 block font-semibold">{t('dashboard.totalProfit')}</span>
                <span className="text-2xl font-black text-agri-900">{formatINR(cycleAnalytics.netProfit)}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-agri-800 block font-semibold">{t('dashboard.profitPerAcre')}</span>
                <span className="text-base font-bold text-agri-900">{formatINR(cycleAnalytics.profitPerAcre)} / Ac</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn-primary w-full mt-2"
          >
            <Download className="w-5 h-5 mr-2" />
            <span>{downloading ? t('reports.preparingPdf') : t('reports.downloadPdf')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

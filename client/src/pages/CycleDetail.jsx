import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import { formatBilingualText } from '../utils/formatters.js';
import {
  Sprout,
  ArrowLeft,
  PlusCircle,
  FileText,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Trash2,
  Calendar,
  Download,
} from 'lucide-react';

export const CycleDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { isOnline, enqueueWrite } = useSync();
  const navigate = useNavigate();

  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadCycleDetail = async () => {
    try {
      if (isOnline) {
        const res = await api.get(`/cycles/${id}`);
        setCycle(res.data.data);
      } else {
        const localCycle = await db.cycles.get(id) || await db.cycles.where('clientId').equals(id).first() || await db.cycles.where('_id').equals(id).first();
        if (localCycle) {
          const expenses = await db.expenses.where('cycleId').equals(localCycle._id || localCycle.clientId).toArray();
          const harvests = await db.harvests.where('cycleId').equals(localCycle._id || localCycle.clientId).toArray();
          const plot = await db.plots.get(localCycle.plotId) || {};

          const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
          const totalRevenue = harvests.reduce((sum, h) => sum + ((h.quantityQuintals || 0) * (h.pricePerQuintal || 0)), 0);
          const netProfit = totalRevenue - totalExpense;
          const plotArea = plot.areaAcres || 1;
          const profitPerAcre = plotArea > 0 ? netProfit / plotArea : netProfit;

          setCycle({
            ...localCycle,
            plotId: plot,
            expenses,
            harvests,
            totalExpense,
            totalRevenue,
            netProfit,
            profitPerAcre: Math.round(profitPerAcre * 100) / 100,
          });
        }
      }
    } catch (err) {
      console.warn('Error fetching cycle details:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycleDetail();
  }, [id, isOnline]);

  const handleDownloadPdf = async () => {
    if (!isOnline) {
      alert(t('reports.pdfRequiresInternet'));
      return;
    }

    setDownloadingPdf(true);
    try {
      const response = await api.get(`/reports/cycle/${cycle._id}/pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AgriVox_${cycle.crop}_${cycle.season}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(t('reports.pdfFailed') + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDeleteCycle = async () => {
    const formattedCrop = formatBilingualText(cycle.crop, i18n.language);
    const confirmMsg = t('cycles.deleteConfirm', { crop: formattedCrop });

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isOnline) {
        await api.delete(`/cycles/${cycle._id}`);
      } else {
        await enqueueWrite('cycles', 'delete', { _id: cycle._id }, cycle.clientId || cycle._id);
      }
      navigate('/cycles');
    } catch (err) {
      alert(err.message || t('common.error'));
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-earth-600 font-semibold">{t('common.loading')}</div>;
  }

  if (!cycle) {
    return (
      <div className="card-farmer text-center py-10">
        <p className="text-earth-700">{t('cycles.notFound')}</p>
        <button onClick={() => navigate('/cycles')} className="btn-secondary mt-3 mx-auto">
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <div>
          <button
            onClick={() => navigate('/cycles')}
            className="text-earth-600 hover:text-earth-900 text-xs font-bold flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('cycles.title')}
          </button>
          <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
            <Sprout className="w-6 h-6 text-agri-700" />
            {formatBilingualText(cycle.crop, i18n.language)}
          </h1>
          <p className="text-xs text-earth-600 mt-0.5">
            {formatBilingualText(cycle.season, i18n.language)} {cycle.year} • {formatBilingualText(cycle.plotId?.name, i18n.language) || (i18n.language === 'te' ? 'పొలం' : 'Plot')} ({cycle.plotId?.areaAcres || 0} {t('common.acres')})
          </p>
        </div>

        <button
          onClick={handleDeleteCycle}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-earth-400 hover:text-red-700 transition-colors"
          title="Delete Cycle"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-farmer bg-white border-l-4 border-l-agri-700 col-span-2 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-earth-600 mb-0.5">
            {t('dashboard.totalProfit')}
          </div>
          <div className={`text-3xl font-extrabold ${cycle.netProfit >= 0 ? 'text-agri-800' : 'text-red-700'}`}>
            ₹ {Number(cycle.netProfit || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-earth-600 mt-1">
            ₹ {Number(cycle.profitPerAcre || 0).toLocaleString('en-IN')} / {t('common.acres')}
          </div>
        </div>

        <div className="card-farmer bg-white p-3.5">
          <div className="text-xs font-bold text-earth-600 uppercase mb-0.5">
            {t('dashboard.totalRevenue')}
          </div>
          <div className="text-lg font-bold text-agri-700">
            ₹ {Number(cycle.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
        </div>

        <div className="card-farmer bg-white p-3.5">
          <div className="text-xs font-bold text-earth-600 uppercase mb-0.5">
            {t('dashboard.totalExpenses')}
          </div>
          <div className="text-lg font-bold text-amber-800">
            ₹ {Number(cycle.totalExpense || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          to={`/harvests/add?cycleId=${cycle._id || cycle.clientId}`}
          className="btn-primary min-h-[48px] py-2 px-3 text-sm flex items-center justify-center gap-1.5"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{t('harvests.title')}</span>
        </Link>

        <button
          onClick={handleDownloadPdf}
          disabled={downloadingPdf}
          className="btn-secondary min-h-[48px] py-2 px-3 text-sm flex items-center justify-center gap-1.5"
        >
          <Download className="w-4 h-4 text-earth-700" />
          <span>{downloadingPdf ? t('reports.preparingPdf') : t('reports.downloadPdf')}</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="card-farmer bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-earth-900">
            {t('dashboard.totalExpenses')} ({cycle.expenses?.length || 0})
          </h2>
          <Link
            to="/expenses/add"
            className="text-xs font-bold text-agri-800 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {t('nav.add')}
          </Link>
        </div>

        {cycle.expenses?.length === 0 ? (
          <p className="text-sm text-earth-500 py-3 text-center">{t('cycles.noExpensesYet')}</p>
        ) : (
          <div className="divide-y divide-cream-100 max-h-60 overflow-y-auto">
            {cycle.expenses?.map((e) => (
              <div key={e._id || e.clientId} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-earth-900 text-sm">
                    {formatBilingualText(e.item, i18n.language)}
                  </div>
                  <div className="text-[11px] text-earth-500">
                    {t(`categories.${e.category}`, { defaultValue: e.category })} • {new Date(e.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-bold text-sm text-amber-800">
                  ₹ {Number(e.amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Harvests Table */}
      <div className="card-farmer bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-earth-900">
            {t('dashboard.totalRevenue')} ({cycle.harvests?.length || 0})
          </h2>
          <Link
            to={`/harvests/add?cycleId=${cycle._id || cycle.clientId}`}
            className="text-xs font-bold text-agri-800 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {t('harvests.title')}
          </Link>
        </div>

        {cycle.harvests?.length === 0 ? (
          <p className="text-sm text-earth-500 py-3 text-center">{t('cycles.noHarvestsYet')}</p>
        ) : (
          <div className="divide-y divide-cream-100">
            {cycle.harvests?.map((h) => (
              <div key={h._id || h.clientId} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-earth-900 text-sm">
                    {h.quantityQuintals} {t('common.quintals')} @ ₹{h.pricePerQuintal}
                  </div>
                  <div className="text-[11px] text-earth-500">
                    {h.market || ''} {h.buyer ? `(${h.buyer})` : ''} • {new Date(h.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-bold text-base text-agri-800">
                  ₹ {Number(h.quantityQuintals * h.pricePerQuintal).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

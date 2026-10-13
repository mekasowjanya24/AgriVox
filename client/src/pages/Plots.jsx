import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import { formatBilingualText } from '../utils/formatters.js';
import { MapPin, Plus, Trash2, ArrowRight, AlertCircle, Check } from 'lucide-react';

export const Plots = () => {
  const { t, i18n } = useTranslation();
  const { isOnline, enqueueWrite } = useSync();
  const navigate = useNavigate();

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadPlots = async () => {
    try {
      if (isOnline) {
        const res = await api.get('/plots');
        setPlots(res.data.data || []);
      } else {
        const localPlots = await db.plots.toArray();
        setPlots(localPlots);
      }
    } catch (err) {
      console.warn('Error loading plots:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlots();
  }, [isOnline]);

  const handleDeletePlot = async (id, name) => {
    const formattedName = formatBilingualText(name, i18n.language);
    const confirmText = t('plots.deleteConfirm', { name: formattedName });

    if (!window.confirm(confirmText)) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isOnline) {
        await api.delete(`/plots/${id}`);
      } else {
        await enqueueWrite('plots', 'delete', { _id: id }, id);
      }
      setSuccessMsg(t('plots.deletedSuccess'));
      setPlots((prev) => prev.filter((p) => p._id !== id && p.clientId !== id));
    } catch (err) {
      const msg = err.response?.data?.message || t('plots.cannotDeleteActive');
      setErrorMsg(msg);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <div>
          <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-agri-700" />
            {t('plots.title')}
          </h1>
        </div>
        <Link to="/plots/new" className="btn-primary py-2 px-3.5 text-sm min-h-[44px]">
          <Plus className="w-4 h-4 mr-1" />
          {t('plots.addNew')}
        </Link>
      </div>

      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-900 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 text-green-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-earth-600 font-medium">{t('common.loading')}</div>
      ) : plots.length === 0 ? (
        <div className="card-farmer text-center py-10 px-4 bg-white">
          <MapPin className="w-12 h-12 text-agri-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-earth-900 mb-1">{t('plots.noPlots')}</h2>
          <p className="text-sm text-earth-600 mb-4">{t('plots.noPlotsDesc')}</p>
          <Link to="/plots/new" className="btn-primary inline-flex">
            <Plus className="w-5 h-5 mr-1" />
            {t('plots.addNew')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plots.map((plot) => (
            <div
              key={plot._id || plot.clientId}
              className="card-farmer bg-white hover:border-agri-300 transition-colors p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-lg text-earth-900">
                  {formatBilingualText(plot.name, i18n.language)}
                </div>
                <div className="text-sm text-earth-600 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="font-semibold text-agri-800">
                    {plot.areaAcres} {t('common.acres')}
                  </span>
                  <span>•</span>
                  <span>{t(`plots.soil${plot.soilType.charAt(0).toUpperCase() + plot.soilType.slice(1)}`, { defaultValue: plot.soilType })}</span>
                  {plot.village && (
                    <>
                      <span>•</span>
                      <span>{formatBilingualText(plot.village, i18n.language)}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeletePlot(plot._id || plot.clientId, plot.name)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-earth-400 hover:text-red-700 transition-colors"
                  title={t('plots.deletePlot')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

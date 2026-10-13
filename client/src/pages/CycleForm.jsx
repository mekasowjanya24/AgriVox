import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import { formatBilingualText } from '../utils/formatters.js';
import { Sprout, ArrowLeft, AlertCircle, Calendar } from 'lucide-react';

export const CycleForm = () => {
  const { t, i18n } = useTranslation();
  const { enqueueWrite, isOnline } = useSync();
  const navigate = useNavigate();

  const [plots, setPlots] = useState([]);
  const [plotId, setPlotId] = useState('');
  const [crop, setCrop] = useState('');
  const [season, setSeason] = useState('Kharif');
  const [year, setYear] = useState(new Date().getFullYear());
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchPlots = async () => {
      try {
        if (isOnline) {
          const res = await api.get('/plots');
          setPlots(res.data.data || []);
          if (res.data.data?.length > 0) {
            setPlotId(res.data.data[0]._id);
          }
        } else {
          const localPlots = await db.plots.toArray();
          setPlots(localPlots);
          if (localPlots.length > 0) {
            setPlotId(localPlots[0]._id || localPlots[0].clientId);
          }
        }
      } catch (err) {
        console.warn('Error fetching plots:', err);
      }
    };
    fetchPlots();
  }, [isOnline]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!plotId) {
      setErrorMsg(t('cycles.plotRequired'));
      return;
    }
    if (!crop.trim()) {
      setErrorMsg(t('cycles.cropRequired'));
      return;
    }

    setSaving(true);
    try {
      await enqueueWrite('cycles', 'create', {
        plotId,
        crop: crop.trim(),
        season,
        year: parseInt(year),
        sowingDate,
        expectedHarvestDate: expectedHarvestDate || null,
        status: 'active',
      });

      navigate('/cycles');
    } catch (err) {
      setErrorMsg(err.message || t('common.error'));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <Sprout className="w-6 h-6 text-agri-700" />
          {t('cycles.addNew')}
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="text-earth-600 hover:text-earth-900 text-sm font-semibold flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-farmer bg-white p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-earth-800 mb-1.5">
            {t('cycles.plot')}
          </label>
          {plots.length === 0 ? (
            <div className="text-sm text-earth-600 py-1">
              {t('plots.noPlots')}.{' '}
              <button
                type="button"
                onClick={() => navigate('/plots/new')}
                className="text-agri-800 font-bold underline"
              >
                {t('dashboard.addFirstPlot')}
              </button>
            </div>
          ) : (
            <select
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              className="input-farmer"
              required
            >
              {plots.map((p) => (
                <option key={p._id || p.clientId} value={p._id || p.clientId}>
                  {formatBilingualText(p.name, i18n.language)} ({p.areaAcres} {t('common.acres')})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-earth-800 mb-1.5">
            {t('cycles.crop')}
          </label>
          <input
            type="text"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            placeholder={t('cycles.cropPlaceholder')}
            className="input-farmer"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('cycles.season')}
            </label>
            <select
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="input-farmer"
            >
              <option value="Kharif">{formatBilingualText('ఖరీఫ్ (Kharif)', i18n.language)}</option>
              <option value="Rabi">{formatBilingualText('రబీ (Rabi)', i18n.language)}</option>
              <option value="Summer">{formatBilingualText('వేసవి (Summer)', i18n.language)}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('cycles.year')}
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="input-farmer"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('cycles.sowingDate')}
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-earth-400 absolute left-3 top-4" />
              <input
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="input-farmer pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('cycles.harvestDate')}
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-earth-400 absolute left-3 top-4" />
              <input
                type="date"
                value={expectedHarvestDate}
                onChange={(e) => setExpectedHarvestDate(e.target.value)}
                className="input-farmer pl-10"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full mt-2"
        >
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </form>
    </div>
  );
};

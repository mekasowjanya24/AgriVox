import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import { formatBilingualText } from '../utils/formatters.js';
import { ArrowLeft, Check, AlertCircle, ShoppingBag, Calendar } from 'lucide-react';

export const AddHarvest = () => {
  const { t, i18n } = useTranslation();
  const { enqueueWrite, isOnline } = useSync();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(searchParams.get('cycleId') || '');
  const [quantityQuintals, setQuantityQuintals] = useState('');
  const [pricePerQuintal, setPricePerQuintal] = useState('');
  const [buyer, setBuyer] = useState('');
  const [market, setMarket] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [closeCycle, setCloseCycle] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchCycles = async () => {
      try {
        if (isOnline) {
          const res = await api.get('/cycles');
          setCycles(res.data.data || []);
          if (!selectedCycleId && res.data.data?.length > 0) {
            setSelectedCycleId(res.data.data[0]._id);
          }
        } else {
          const localCycles = await db.cycles.toArray();
          setCycles(localCycles);
          if (!selectedCycleId && localCycles.length > 0) {
            setSelectedCycleId(localCycles[0]._id || localCycles[0].clientId);
          }
        }
      } catch (err) {
        console.warn('Error loading cycles:', err.message);
      }
    };
    fetchCycles();
  }, [isOnline, selectedCycleId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCycleId) {
      setErrorMsg(t('expenses.selectCropRequired'));
      return;
    }

    const qty = parseFloat(quantityQuintals);
    const price = parseFloat(pricePerQuintal);

    if (!qty || qty <= 0 || !price || price <= 0) {
      setErrorMsg(t('expenses.validAmountRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cycleId: selectedCycleId,
        quantityQuintals: qty,
        pricePerQuintal: price,
        buyer: buyer.trim(),
        market: market.trim(),
        date,
        closeCycle,
      };

      await enqueueWrite('harvests', 'create', payload);

      setSuccessMsg(t('harvests.savedSuccess'));
      setTimeout(() => {
        navigate(`/cycles/${selectedCycleId}`);
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const totalSale = (parseFloat(quantityQuintals) || 0) * (parseFloat(pricePerQuintal) || 0);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-agri-700" />
          {t('harvests.title')}
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="text-earth-600 hover:text-earth-900 text-sm font-semibold flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-900 font-semibold text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-green-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card-farmer bg-white p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-earth-800 mb-1.5">
            {t('cycles.crop')}
          </label>
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="input-farmer"
            required
          >
            {cycles.map((c) => (
              <option key={c._id || c.clientId} value={c._id || c.clientId}>
                {formatBilingualText(c.crop, i18n.language)} ({formatBilingualText(c.season, i18n.language)} {c.year}) - {formatBilingualText(c.plotId?.name, i18n.language) || (i18n.language === 'te' ? 'పొలం' : 'Plot')}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('harvests.qtyQuintals')}
            </label>
            <input
              type="number"
              step="any"
              value={quantityQuintals}
              onChange={(e) => setQuantityQuintals(e.target.value)}
              placeholder="50"
              className="input-farmer font-bold text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('harvests.pricePerQtl')}
            </label>
            <input
              type="number"
              step="any"
              value={pricePerQuintal}
              onChange={(e) => setPricePerQuintal(e.target.value)}
              placeholder="₹"
              className="input-farmer font-bold text-lg text-agri-800"
              required
            />
          </div>
        </div>

        {totalSale > 0 && (
          <div className="p-3 bg-agri-50 rounded-xl border border-agri-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-agri-900">
              {t('harvests.totalSale')}:
            </span>
            <span className="text-xl font-extrabold text-agri-800">
              ₹ {totalSale.toLocaleString('en-IN')}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('harvests.buyer')}
            </label>
            <input
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="వ్యాపారి పేరు"
              className="input-farmer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('harvests.market')}
            </label>
            <input
              type="text"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              placeholder="మార్కెట్ / మండి"
              className="input-farmer"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-earth-800 mb-1.5">
            {t('harvests.date')}
          </label>
          <div className="relative">
            <Calendar className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-farmer pl-11"
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="closeCycle"
            checked={closeCycle}
            onChange={(e) => setCloseCycle(e.target.checked)}
            className="w-5 h-5 text-agri-800 rounded accent-agri-800"
          />
          <label htmlFor="closeCycle" className="text-sm font-semibold text-earth-800 cursor-pointer">
            {t('harvests.closeCyclePrompt')}
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full mt-3"
        >
          {saving ? t('common.loading') : t('harvests.saveHarvest')}
        </button>
      </form>
    </div>
  );
};

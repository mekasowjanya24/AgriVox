import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client.js';
import { UploadCloud, RefreshCw, Check, AlertCircle, ArrowLeft, Cpu } from 'lucide-react';

export const AdminPrices = () => {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [retrainCommodity, setRetrainCommodity] = useState('Paddy');
  const [retrainMarket, setRetrainMarket] = useState('Warangal');

  const handleUploadCSV = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage('');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/prices/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message || t('admin.uploadSuccess'));
      setFile(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (i18n.language === 'te' ? 'CSV అప్‌లోడ్ విఫలమైంది' : 'CSV upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleFetchPrices = async () => {
    setFetching(true);
    setMessage('');
    setErrorMsg('');
    try {
      const res = await api.post('/admin/prices/fetch');
      setMessage(res.data.message);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (i18n.language === 'te' ? 'ధరల నవీకరణ విఫలమైంది' : 'Failed to update prices'));
    } finally {
      setFetching(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setMessage('');
    setErrorMsg('');
    try {
      const res = await api.post(`/admin/forecast/retrain?commodity=${retrainCommodity}&market=${retrainMarket}`);
      setMessage(`Forecast model retrained successfully! MAPE: ${res.data.data.mape}%`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (i18n.language === 'te' ? 'మోడల్ రీట్రైనింగ్ విఫలమైంది' : 'Model retraining failed'));
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <div>
          <Link to="/admin/stats" className="text-xs text-earth-600 font-bold flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('admin.title')}
          </Link>
          <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-agri-700" />
            {t('admin.priceUpload')}
          </h1>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-900 font-semibold text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-green-700" />
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* CSV Upload */}
      <form onSubmit={handleUploadCSV} className="card-farmer bg-white p-5 space-y-4">
        <h2 className="text-base font-bold text-earth-900">{i18n.language === 'te' ? 'ధరల CSV అప్‌లోడ్' : 'Price CSV Upload'}</h2>
        <p className="text-xs text-earth-600">
          {i18n.language === 'te'
            ? 'కాలమ్‌లు: commodity, market, district, state, date, min_price, max_price, modal_price'
            : 'Columns: commodity, market, district, state, date, min_price, max_price, modal_price'}
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="input-farmer text-sm p-2"
          required
        />

        <button
          type="submit"
          disabled={uploading || !file}
          className="btn-primary w-full"
        >
          {uploading ? t('common.loading') : (i18n.language === 'te' ? 'CSV అప్‌లోడ్ చేయండి' : 'Upload CSV')}
        </button>
      </form>

      {/* Agmarknet Refresh */}
      <div className="card-farmer bg-white p-5 space-y-3">
        <h2 className="text-base font-bold text-earth-900">{t('admin.fetchPrices')}</h2>
        <p className="text-xs text-earth-600">
          {i18n.language === 'te'
            ? 'Agmarknet API లేదా స్థానిక సీడ్ డేటా నుండి తాజా మార్కెట్ ధరలను సర్వర్‌కు నవీకరించండి.'
            : 'Fetch latest mandi prices from Agmarknet API or synthetic seed data to the server.'}
        </p>
        <button
          onClick={handleFetchPrices}
          disabled={fetching}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
          <span>{fetching ? t('common.loading') : t('admin.fetchPrices')}</span>
        </button>
      </div>

      {/* Retrain Forecast */}
      <div className="card-farmer bg-white p-5 space-y-3">
        <h2 className="text-base font-bold text-earth-900 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-800" />
          {t('admin.retrainModel')}
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={retrainCommodity}
            onChange={(e) => setRetrainCommodity(e.target.value)}
            className="input-farmer"
          >
            <option value="Paddy">Paddy</option>
            <option value="Cotton">Cotton</option>
            <option value="Maize">Maize</option>
          </select>
          <select
            value={retrainMarket}
            onChange={(e) => setRetrainMarket(e.target.value)}
            className="input-farmer"
          >
            <option value="Warangal">Warangal</option>
            <option value="Khammam">Khammam</option>
          </select>
        </div>

        <button
          onClick={handleRetrain}
          disabled={retraining}
          className="btn-accent w-full flex items-center justify-center gap-2"
        >
          <Cpu className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
          <span>{retraining ? t('common.loading') : t('admin.retrainModel')}</span>
        </button>
      </div>
    </div>
  );
};

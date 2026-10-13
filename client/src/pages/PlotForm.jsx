import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { MapPin, ArrowLeft, Check, AlertCircle } from 'lucide-react';

export const PlotForm = () => {
  const { t, i18n } = useTranslation();
  const { enqueueWrite } = useSync();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [areaAcres, setAreaAcres] = useState('');
  const [soilType, setSoilType] = useState('black');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const area = parseFloat(areaAcres);
    if (!name.trim()) {
      setErrorMsg(t('plots.nameRequired'));
      return;
    }
    if (!area || area <= 0) {
      setErrorMsg(t('plots.areaRequired'));
      return;
    }

    setSaving(true);
    try {
      await enqueueWrite('plots', 'create', {
        name: name.trim(),
        areaAcres: area,
        soilType,
        village: village.trim(),
        district: district.trim(),
      });

      navigate('/plots');
    } catch (err) {
      setErrorMsg(err.message || t('plots.saveError'));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-agri-700" />
          {t('plots.addNew')}
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
            {t('plots.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('plots.namePlaceholder')}
            className="input-farmer"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('plots.areaAcres')}
            </label>
            <input
              type="number"
              step="any"
              value={areaAcres}
              onChange={(e) => setAreaAcres(e.target.value)}
              placeholder="2.5"
              className="input-farmer font-bold text-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('plots.soilType')}
            </label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
              className="input-farmer"
            >
              <option value="black">{t('plots.soilBlack')}</option>
              <option value="red">{t('plots.soilRed')}</option>
              <option value="sandy">{t('plots.soilSandy')}</option>
              <option value="loamy">{t('plots.soilLoamy')}</option>
              <option value="clay">{t('plots.soilClay')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('plots.village')}
            </label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={t('plots.villagePlaceholder')}
              className="input-farmer"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('plots.district')}
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder={t('plots.districtPlaceholder')}
              className="input-farmer"
            />
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

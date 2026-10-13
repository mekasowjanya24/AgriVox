import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { useSync } from '../context/SyncContext.jsx';
import { changeLanguage } from '../i18n/index.js';
import {
  Settings as SettingsIcon,
  Globe,
  Sliders,
  RefreshCw,
  LogOut,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';

export const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user, updateProfile, logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();

  const [language, setLanguage] = useState(i18n.language || 'te');
  const [storageCost, setStorageCost] = useState(user?.storageCostPerQuintalPerDay || 2);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    await changeLanguage(lang);
    if (user) {
      await updateProfile({ language: lang });
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        language,
        storageCostPerQuintalPerDay: parseFloat(storageCost) || 2,
      });
      setSuccessMsg(t('settings.storageCostSaved'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.warn('Settings save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-agri-700" />
          {t('settings.title')}
        </h1>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-900 font-semibold text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-green-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Language Section */}
      <div className="card-farmer bg-white p-5 space-y-3">
        <div className="flex items-center gap-2 text-earth-900 font-bold text-base">
          <Globe className="w-5 h-5 text-agri-700" />
          <h2>{t('settings.language')}</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleLanguageChange('te')}
            className={`min-h-[48px] py-2 px-3 rounded-xl border font-bold text-base transition-all ${
              language === 'te'
                ? 'bg-agri-800 text-white border-agri-900 shadow-sm'
                : 'bg-cream-50 text-earth-800 border-earth-300 hover:bg-cream-100'
            }`}
          >
            {t('settings.telugu')}
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`min-h-[48px] py-2 px-3 rounded-xl border font-bold text-base transition-all ${
              language === 'en'
                ? 'bg-agri-800 text-white border-agri-900 shadow-sm'
                : 'bg-cream-50 text-earth-800 border-earth-300 hover:bg-cream-100'
            }`}
          >
            {t('settings.english')}
          </button>
        </div>
      </div>

      {/* Default Storage Cost Form */}
      <form onSubmit={handleSaveSettings} className="card-farmer bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 text-earth-900 font-bold text-base">
          <Sliders className="w-5 h-5 text-agri-700" />
          <h2>{t('settings.storageCostTitle')}</h2>
        </div>

        <div>
          <label className="block text-xs font-bold text-earth-700 uppercase mb-1">
            {t('settings.storageCostUnit')}
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={storageCost}
            onChange={(e) => setStorageCost(e.target.value)}
            className="input-farmer font-bold text-lg text-amber-800"
            required
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? t('common.loading') : t('settings.saveSettings')}
        </button>
      </form>

      {/* Offline Sync Controls */}
      <div className="card-farmer bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-earth-900 font-bold text-base">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-700" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-700" />
            )}
            <h2>{t('settings.offlineSyncTitle')}</h2>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              isOnline
                ? 'bg-green-100 text-green-900 border-green-300'
                : 'bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            {isOnline ? t('app.syncOnline') : t('app.syncOffline')}
          </span>
        </div>

        <p className="text-xs text-earth-600">
          {t('settings.offlineDesc')}
        </p>

        {pendingCount > 0 && (
          <div className="p-2.5 bg-amber-50 rounded-lg text-xs font-bold text-amber-900 border border-amber-200">
            {t('app.pendingChanges', { count: pendingCount })}
          </div>
        )}

        <button
          type="button"
          onClick={triggerSync}
          disabled={isSyncing || !isOnline}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? t('app.syncSyncing') : t('settings.syncNow')}</span>
        </button>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={logout}
        className="w-full min-h-[50px] p-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-base flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        <span>{t('nav.logout')}</span>
      </button>
    </div>
  );
};

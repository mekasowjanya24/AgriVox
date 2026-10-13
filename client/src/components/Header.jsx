import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSync } from '../context/SyncContext.jsx';
import { changeLanguage } from '../i18n/index.js';
import { Sprout, Wifi, WifiOff, RefreshCw, Settings as SettingsIcon, Shield } from 'lucide-react';

export const Header = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, updateProfile } = useAuth();
  const { isOnline, isSyncing, pendingCount, triggerSync } = useSync();

  const handleSelectLanguage = async (nextLang) => {
    if (i18n.language === nextLang) return;
    await changeLanguage(nextLang);
    if (user) {
      updateProfile({ language: nextLang });
    }
  };

  const isTelugu = i18n.language === 'te';

  return (
    <header className="sticky top-0 z-30 bg-[#fdfbf7] border-b border-[#eee8dc] px-4 py-2.5">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-agri-800 flex items-center justify-center text-cream-50 shadow-sm">
            <Sprout className="w-6 h-6 text-agri-300" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight text-agri-950 font-sans">
              {t('app.name')}
            </div>
            <div className="text-xs text-earth-600 font-medium -mt-1 hidden sm:block">
              {t('app.tagline')}
            </div>
          </div>
        </Link>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2">
          {/* Sync Badge */}
          <button
            onClick={triggerSync}
            title={t('settings.syncNow')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              !isOnline
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : isSyncing
                ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
                : 'bg-agri-50 text-agri-800 border-agri-200'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('app.syncOffline')}</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                <span>{t('app.syncSyncing')}</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-agri-600 inline-block"></span>
                <span>{t('app.syncOnline')}</span>
              </>
            )}

            {pendingCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>

          {/* Explicit Language Segmented Control: [ తెలుగు | English ] */}
          <div className="flex items-center bg-cream-100 rounded-xl p-0.5 border border-earth-200 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSelectLanguage('te')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                isTelugu
                  ? 'bg-agri-800 text-white shadow-xs'
                  : 'text-earth-700 hover:text-earth-950'
              }`}
            >
              తెలుగు
            </button>
            <button
              type="button"
              onClick={() => handleSelectLanguage('en')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                !isTelugu
                  ? 'bg-agri-800 text-white shadow-xs'
                  : 'text-earth-700 hover:text-earth-950'
              }`}
            >
              English
            </button>
          </div>

          {/* Admin link if role is admin */}
          {isAdmin && (
            <Link
              to="/admin/stats"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300"
              title="Admin Panel"
            >
              <Shield className="w-5 h-5 text-amber-800" />
            </Link>
          )}

          {/* Settings link */}
          <Link
            to="/settings"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl bg-cream-100 hover:bg-cream-200 text-earth-800 border border-earth-200 transition-colors"
            title={t('nav.settings')}
          >
            <SettingsIcon className="w-5 h-5 text-earth-700" />
          </Link>
        </div>
      </div>
    </header>
  );
};

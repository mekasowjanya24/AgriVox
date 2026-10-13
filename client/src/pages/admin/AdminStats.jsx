import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client.js';
import { Shield, Users, MapPin, Sprout, DollarSign, Calendar, UploadCloud, RefreshCw } from 'lucide-react';

export const AdminStats = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      console.warn('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-8">
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-800" />
          {t('admin.title')}
        </h1>
        <div className="flex gap-2">
          <Link to="/admin/users" className="btn-secondary py-1.5 px-2.5 text-xs">
            {t('admin.users')}
          </Link>
          <Link to="/admin/prices" className="btn-secondary py-1.5 px-2.5 text-xs">
            {t('admin.priceUpload')}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-earth-600">{t('common.loading')}</div>
      ) : stats ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="card-farmer bg-white p-4">
              <div className="flex items-center justify-between text-xs font-bold text-earth-600 uppercase mb-1">
                <span>{t('admin.userCount')}</span>
                <Users className="w-4 h-4 text-agri-700" />
              </div>
              <div className="text-2xl font-black text-earth-900">{stats.userCount}</div>
            </div>

            <div className="card-farmer bg-white p-4">
              <div className="flex items-center justify-between text-xs font-bold text-earth-600 uppercase mb-1">
                <span>{t('admin.plotCount')}</span>
                <MapPin className="w-4 h-4 text-agri-700" />
              </div>
              <div className="text-2xl font-black text-earth-900">{stats.plotCount}</div>
            </div>

            <div className="card-farmer bg-white p-4">
              <div className="flex items-center justify-between text-xs font-bold text-earth-600 uppercase mb-1">
                <span>{t('admin.cycleCount')}</span>
                <Sprout className="w-4 h-4 text-agri-700" />
              </div>
              <div className="text-2xl font-black text-earth-900">{stats.cycleCount}</div>
            </div>

            <div className="card-farmer bg-white p-4">
              <div className="flex items-center justify-between text-xs font-bold text-earth-600 uppercase mb-1">
                <span>{t('admin.totalExpensesLogged')}</span>
                <DollarSign className="w-4 h-4 text-amber-800" />
              </div>
              <div className="text-2xl font-black text-amber-900">{stats.totalExpensesLogged}</div>
            </div>
          </div>

          <div className="card-farmer bg-white p-4 space-y-2 text-sm text-earth-800">
            <div className="flex justify-between py-1 border-b border-cream-100">
              <span className="text-earth-600">{t('admin.lastPriceDate')}:</span>
              <span className="font-semibold">{stats.lastPriceDate ? new Date(stats.lastPriceDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-earth-600">{t('admin.lastForecastDate')}:</span>
              <span className="font-semibold">{stats.lastForecastDate ? new Date(stats.lastForecastDate).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

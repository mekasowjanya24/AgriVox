import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import { formatBilingualText } from '../utils/formatters.js';
import { Sprout, Plus, ArrowRight, Calendar, DollarSign } from 'lucide-react';

export const Cycles = () => {
  const { t, i18n } = useTranslation();
  const { isOnline } = useSync();
  const navigate = useNavigate();

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCycles = async () => {
    try {
      if (isOnline) {
        const res = await api.get('/cycles');
        setCycles(res.data.data || []);
      } else {
        const localCycles = await db.cycles.toArray();
        setCycles(localCycles);
      }
    } catch (err) {
      console.warn('Error loading cycles:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
  }, [isOnline]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">{t('cycles.active')}</span>;
      case 'harvested':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">{t('cycles.harvested')}</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-earth-100 text-earth-700 border border-earth-300">{t('cycles.closed')}</span>;
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          <Sprout className="w-6 h-6 text-agri-700" />
          {t('cycles.title')}
        </h1>
        <Link to="/cycles/new" className="btn-primary py-2 px-3.5 text-sm min-h-[44px]">
          <Plus className="w-4 h-4 mr-1" />
          {t('cycles.addNew')}
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-8 text-earth-600 font-medium">{t('common.loading')}</div>
      ) : cycles.length === 0 ? (
        <div className="card-farmer text-center py-10 px-4 bg-white">
          <Sprout className="w-12 h-12 text-agri-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-earth-900 mb-1">{t('cycles.noCycles')}</h2>
          <p className="text-sm text-earth-600 mb-4">{t('cycles.noCyclesDesc')}</p>
          <Link to="/cycles/new" className="btn-primary inline-flex">
            <Plus className="w-5 h-5 mr-1" />
            {t('cycles.addNew')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <Link
              key={cycle._id || cycle.clientId}
              to={`/cycles/${cycle._id || cycle.clientId}`}
              className="card-farmer bg-white hover:border-agri-400 block transition-all p-4 active:scale-[0.99]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xl text-earth-900">
                      {formatBilingualText(cycle.crop, i18n.language)}
                    </span>
                    {getStatusBadge(cycle.status)}
                  </div>
                  <div className="text-sm text-earth-600 mt-1">
                    {formatBilingualText(cycle.season, i18n.language)} {cycle.year} • {formatBilingualText(cycle.plotId?.name, i18n.language) || (i18n.language === 'te' ? 'పొలం' : 'Plot')}
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-earth-400 mt-1" />
              </div>

              <div className="mt-3 pt-3 border-t border-cream-100 flex items-center justify-between text-xs text-earth-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('cycles.sowingDate')}: {new Date(cycle.sowingDate).toLocaleDateString()}
                </span>
                <span className="font-semibold text-agri-800">
                  {t('cycles.viewDetails')} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

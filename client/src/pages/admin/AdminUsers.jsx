import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client.js';
import { formatBilingualText } from '../../utils/formatters.js';
import { Users, Search, Check, X, Shield, ArrowLeft } from 'lucide-react';

export const AdminUsers = () => {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(search)}`);
      setUsers(res.data.data || []);
    } catch (err) {
      console.warn('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const toggleUser = async (id, currentStatus) => {
    try {
      const res = await api.patch(`/admin/users/${id}`, { isActive: !currentStatus });
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, isActive: res.data.data.isActive } : u))
      );
    } catch (err) {
      alert((i18n.language === 'te' ? 'వినియోగదారు స్థితి మార్చడం విఫలమైంది: ' : 'Failed to update user status: ') + err.message);
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
            <Users className="w-6 h-6 text-agri-700" />
            {t('admin.users')}
          </h1>
        </div>
      </div>

      <div className="card-farmer bg-white p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-earth-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={i18n.language === 'te' ? 'పేరు లేదా మొబైల్ నంబర్ వెతకండి...' : 'Search by name or mobile number...'}
            className="input-farmer pl-9 min-h-[44px] text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-earth-600">{t('common.loading')}</div>
      ) : (
        <div className="space-y-2.5">
          {users.map((u) => (
            <div
              key={u._id}
              className="card-farmer bg-white p-3.5 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-base text-earth-900 flex items-center gap-2">
                  <span>{formatBilingualText(u.name, i18n.language)}</span>
                  {u.role === 'admin' && (
                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-xs text-earth-600 mt-0.5">
                  {u.phone} • {u.language === 'te' ? (i18n.language === 'te' ? 'తెలుగు' : 'Telugu') : 'English'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleUser(u._id, u.isActive)}
                className={`min-h-[40px] px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  u.isActive
                    ? 'bg-green-50 text-green-800 border-green-300 hover:bg-green-100'
                    : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                }`}
              >
                {u.isActive ? t('admin.active') : t('admin.inactive')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

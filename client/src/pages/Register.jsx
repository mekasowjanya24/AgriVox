import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { Sprout, Phone, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

export const Register = () => {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'te');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length !== 10) {
      setError(i18n.language === 'te' ? 'మొబైల్ నంబర్ తప్పనిసరిగా 10 అంకెలు ఉండాలి' : 'Phone number must be exactly 10 digits');
      return;
    }

    if (password.length < 6) {
      setError(i18n.language === 'te' ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register({ name, phone, password, language, role: 'farmer' });
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || (i18n.language === 'te' ? 'నమోదు విఫలమైంది. మళ్ళీ ప్రయత్నించండి.' : 'Registration failed. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col justify-center px-4 py-8">
      <div className="max-w-md w-full mx-auto">
        <div className="card-farmer bg-white border border-[#eee8dc] p-6 shadow-md rounded-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-agri-800 flex items-center justify-center text-white mx-auto mb-2 shadow-sm">
              <Sprout className="w-8 h-8 text-agri-300" />
            </div>
            <h1 className="text-2xl font-bold text-agri-950 font-sans">
              {t('app.name')}
            </h1>
          </div>

          <h2 className="text-xl font-bold text-earth-900 mb-4 pb-2 border-b border-cream-200">
            {t('auth.registerTitle')}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-earth-800 mb-1.5">
                {t('auth.name')}
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
                <input
                  type="text"
                  className="input-farmer pl-11"
                  placeholder={t('auth.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-earth-800 mb-1.5">
                {t('auth.phone')}
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
                <input
                  type="tel"
                  maxLength={10}
                  className="input-farmer pl-11"
                  placeholder={t('auth.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-earth-800 mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
                <input
                  type="password"
                  className="input-farmer pl-11"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-earth-800 mb-1.5">
                {t('auth.selectLanguage')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('te')}
                  className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all ${
                    language === 'te'
                      ? 'bg-agri-800 text-white border-agri-900'
                      : 'bg-cream-100 text-earth-800 border-earth-300'
                  }`}
                >
                  {t('settings.telugu')}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all ${
                    language === 'en'
                      ? 'bg-agri-800 text-white border-agri-900'
                      : 'bg-cream-100 text-earth-800 border-earth-300'
                  }`}
                >
                  {t('settings.english')}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? t('common.loading') : (
                <span className="flex items-center justify-center gap-2">
                  {t('auth.registerAction')}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="text-agri-800 hover:text-agri-950 font-bold text-sm underline underline-offset-4"
            >
              {t('auth.alreadyAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

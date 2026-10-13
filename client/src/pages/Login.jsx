import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.jsx';
import { changeLanguage } from '../i18n/index.js';
import { Sprout, Phone, Lock, ArrowRight, AlertCircle, Globe } from 'lucide-react';

export const Login = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('8888888888'); // Pre-filled with demo farmer
  const [password, setPassword] = useState('Farmer@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLanguage = async () => {
    const nextLang = i18n.language === 'te' ? 'en' : 'te';
    await changeLanguage(nextLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || phone.length !== 10) {
      setError(i18n.language === 'te' ? 'దయచేసి 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి' : 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || (i18n.language === 'te' ? 'లాగిన్ విఫలమైంది. మొబైల్ లేదా పాస్‌వర్డ్ తనిఖీ చేయండి.' : 'Login failed. Please check phone or password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col justify-center px-4 py-8">
      <div className="max-w-md w-full mx-auto">
        {/* Language switch button at top right */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center bg-cream-100 rounded-xl p-0.5 border border-earth-200 shadow-2xs">
            <button
              type="button"
              onClick={() => changeLanguage('te')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                i18n.language === 'te'
                  ? 'bg-agri-800 text-white shadow-xs'
                  : 'text-earth-700 hover:text-earth-950'
              }`}
            >
              తెలుగు
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all min-h-[36px] ${
                i18n.language === 'en'
                  ? 'bg-agri-800 text-white shadow-xs'
                  : 'text-earth-700 hover:text-earth-950'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="card-farmer bg-white border border-[#eee8dc] p-6 shadow-md rounded-2xl">
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-agri-800 flex items-center justify-center text-white mx-auto mb-3 shadow-sm">
              <Sprout className="w-10 h-10 text-agri-300" />
            </div>
            <h1 className="text-2xl font-bold text-agri-950 font-sans">
              {t('app.name')}
            </h1>
            <p className="text-earth-600 text-sm mt-1">
              {t('auth.welcome')}
            </p>
          </div>

          <h2 className="text-xl font-bold text-earth-900 mb-4 pb-2 border-b border-cream-200">
            {t('auth.loginTitle')}
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? t('common.loading') : (
                <span className="flex items-center justify-center gap-2">
                  {t('auth.loginAction')}
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </button>
          </form>

          {/* Demo account badges */}
          <div className="mt-6 pt-4 border-t border-cream-200 text-xs text-earth-600">
            <p className="font-semibold text-earth-700 mb-1">
              {i18n.language === 'te' ? 'డెమో లాగిన్ ఖాతాలు:' : 'Demo Login Accounts:'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPhone('8888888888'); setPassword('Farmer@123'); }}
                className="flex-1 py-1.5 px-2 bg-cream-100 hover:bg-cream-200 rounded-lg text-earth-800 font-medium text-center border border-earth-200"
              >
                {i18n.language === 'te' ? 'రైతు (Farmer)' : 'Farmer'}
              </button>
              <button
                type="button"
                onClick={() => { setPhone('9999999999'); setPassword('Admin@123'); }}
                className="flex-1 py-1.5 px-2 bg-cream-100 hover:bg-cream-200 rounded-lg text-earth-800 font-medium text-center border border-earth-200"
              >
                {i18n.language === 'te' ? 'అడ్మిన్ (Admin)' : 'Admin'}
              </button>
            </div>
          </div>

          <div className="mt-5 text-center">
            <Link
              to="/register"
              className="text-agri-800 hover:text-agri-950 font-bold text-sm underline underline-offset-4"
            >
              {t('auth.noAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

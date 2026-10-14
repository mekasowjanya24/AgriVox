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
  const [fieldErrors, setFieldErrors] = useState({ name: '', phone: '', password: '' });

  const validateFields = () => {
    const errs = { name: '', phone: '', password: '' };
    let isValid = true;

    if (!name.trim()) {
      errs.name = t('auth.nameRequired');
      isValid = false;
    }

    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      errs.phone = t('auth.phoneDigitsRequired');
      isValid = false;
    }

    if (!password || password.length < 6) {
      errs.password = t('auth.passwordLengthRequired');
      isValid = false;
    }

    setFieldErrors(errs);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateFields()) {
      return;
    }

    setLoading(true);
    try {
      await register({ name: name.trim(), phone, password, language, role: 'farmer' });
      navigate('/');
    } catch (err) {
      const serverMsg = err.response?.data?.message || '';
      const isDuplicate = err.response?.status === 409 || serverMsg.toLowerCase().includes('already') || serverMsg.toLowerCase().includes('duplicate');

      let userMsg = '';
      if (isDuplicate) {
        userMsg = t('auth.phoneAlreadyRegistered');
        setFieldErrors((prev) => ({ ...prev, phone: userMsg }));
      } else {
        userMsg = i18n.language === 'te' ? 'నమోదు విఫలమైంది. దయచేసి వివరాలను సరిచూసి మళ్ళీ ప్రయత్నించండి.' : 'Registration failed. Please check your details and try again.';
      }
      setError(userMsg);
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-earth-800">
                  {t('auth.name')}
                </label>
                {fieldErrors.name && (
                  <span className="text-xs text-red-600 font-semibold">{fieldErrors.name}</span>
                )}
              </div>
              <div className="relative">
                <User className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
                <input
                  type="text"
                  className={`input-farmer pl-11 ${fieldErrors.name ? 'border-red-500' : ''}`}
                  placeholder={t('auth.namePlaceholder')}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-earth-800">
                  {t('auth.phone')}
                </label>
                {fieldErrors.phone && (
                  <span className="text-xs text-red-600 font-semibold">{fieldErrors.phone}</span>
                )}
              </div>
              <div className="relative">
                <Phone className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
                <input
                  type="tel"
                  maxLength={10}
                  className={`input-farmer pl-11 ${fieldErrors.phone ? 'border-red-500' : ''}`}
                  placeholder={t('auth.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    setPhone(cleaned);
                    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-earth-800">
                  {t('auth.password')}
                </label>
                {fieldErrors.password && (
                  <span className="text-xs text-red-600 font-semibold">{fieldErrors.password}</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
                <input
                  type="password"
                  className={`input-farmer pl-11 ${fieldErrors.password ? 'border-red-500' : ''}`}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
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

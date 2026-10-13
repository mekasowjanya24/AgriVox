import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSync } from '../context/SyncContext.jsx';
import { parseVoiceExpense } from '../utils/voiceParser.js';
import { formatBilingualText } from '../utils/formatters.js';
import { api } from '../api/client.js';
import { db } from '../db/index.js';
import {
  Mic,
  MicOff,
  Volume2,
  Check,
  Edit2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const AddExpense = () => {
  const { t, i18n } = useTranslation();
  const { enqueueWrite, isOnline } = useSync();
  const navigate = useNavigate();

  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [activeTab, setActiveTab] = useState('voice'); // 'voice' or 'manual'

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);

  // Manual & Confirmation Form Fields
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('fertilizer');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Load available active crop cycles
  useEffect(() => {
    const fetchCycles = async () => {
      try {
        if (isOnline) {
          const res = await api.get('/cycles');
          setCycles(res.data.data || []);
          if (res.data.data?.length > 0) {
            setSelectedCycleId(res.data.data[0]._id);
          }
        } else {
          const localCycles = await db.cycles.toArray();
          setCycles(localCycles);
          if (localCycles.length > 0) {
            setSelectedCycleId(localCycles[0]._id || localCycles[0].clientId);
          }
        }
      } catch (err) {
        console.warn('Failed to load cycles:', err.message);
      }
    };
    fetchCycles();
  }, [isOnline]);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setActiveTab('manual');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = i18n.language === 'te' ? 'te-IN' : 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg('');
    };

    recognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      setTranscript(speechText);
      setIsListening(false);

      // Parse transcript
      const parsed = parseVoiceExpense(speechText, recognition.lang);
      setParsedResult(parsed);

      // Populate form fields with parsed values
      setItem(parsed.item);
      setAmount(parsed.amount ? parsed.amount.toString() : '');
      setCategory(parsed.category);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
        setErrorMsg(t('expenses.speechError'));
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [i18n.language, t]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setErrorMsg('');
      setSuccessMsg('');
      setParsedResult(null);
      setTranscript('');
      try {
        recognitionRef.current.lang = i18n.language === 'te' ? 'te-IN' : 'en-IN';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start failed:', err);
      }
    }
  };

  const handleSaveExpense = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!selectedCycleId) {
      setErrorMsg(t('expenses.selectCropRequired'));
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg(t('expenses.validAmountRequired'));
      return;
    }

    if (!item.trim()) {
      setErrorMsg(t('expenses.itemNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cycleId: selectedCycleId,
        category,
        item: item.trim(),
        amount: numAmount,
        date,
        note: note.trim(),
        source: activeTab === 'voice' && parsedResult ? 'voice' : 'manual',
      };

      // Optimistic save via offline sync engine
      await enqueueWrite('expenses', 'create', payload);

      setSuccessMsg(t('expenses.savedSuccess'));

      // Reset form
      setItem('');
      setAmount('');
      setParsedResult(null);
      setTranscript('');

      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || t('expenses.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const categoriesList = [
    'fertilizer',
    'seeds',
    'pesticide',
    'labour',
    'irrigation',
    'machinery',
    'transport',
    'other',
  ];

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-cream-200">
        <h1 className="text-2xl font-bold text-earth-900 flex items-center gap-2">
          {t('expenses.title')}
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="text-earth-600 hover:text-earth-900 text-sm font-semibold flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
      </div>

      {/* Cycle Selector */}
      <div className="card-farmer bg-white p-3.5">
        <label className="block text-sm font-bold text-earth-800 mb-1 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-agri-700" />
          {t('expenses.selectCycle')}
        </label>
        {cycles.length === 0 ? (
          <div className="text-sm text-earth-600 py-1">
            {t('expenses.noCycles')}
            <button
              onClick={() => navigate('/cycles/new')}
              className="text-agri-800 font-bold underline"
            >
              {t('expenses.startNewCrop')}
            </button>
          </div>
        ) : (
          <select
            value={selectedCycleId}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="input-farmer"
          >
            {cycles.map((c) => (
              <option key={c._id || c.clientId} value={c._id || c.clientId}>
                {formatBilingualText(c.crop, i18n.language)} ({c.season} {c.year}) - {formatBilingualText(c.plotId?.name, i18n.language) || t('cycles.defaultPlot')}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs: Voice vs Manual */}
      {voiceSupported && (
        <div className="grid grid-cols-2 gap-2 bg-cream-100 p-1.5 rounded-2xl border border-cream-200">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`min-h-[48px] py-2 px-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              activeTab === 'voice'
                ? 'bg-agri-800 text-white shadow-sm'
                : 'text-earth-700 hover:bg-cream-200'
            }`}
          >
            <Mic className="w-5 h-5" />
            <span>{t('expenses.voiceEntry')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`min-h-[48px] py-2 px-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
              activeTab === 'manual'
                ? 'bg-agri-800 text-white shadow-sm'
                : 'text-earth-700 hover:bg-cream-200'
            }`}
          >
            <Edit2 className="w-5 h-5" />
            <span>{t('expenses.manualEntry')}</span>
          </button>
        </div>
      )}

      {/* Status Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-900 font-semibold text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-green-700" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* VOICE ENTRY MODE */}
      {activeTab === 'voice' && (
        <div className="space-y-4">
          <div className="card-farmer bg-white text-center py-6 px-4 border-2 border-agri-100">
            <p className="text-earth-800 font-bold text-lg mb-1">
              {isListening ? t('expenses.listening') : t('expenses.speakPrompt')}
            </p>
            <p className="text-earth-600 text-sm mb-6 max-w-xs mx-auto">
              {t('expenses.speakExample')}
            </p>

            {/* BIG MIC BUTTON */}
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={toggleListening}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                  isListening
                    ? 'bg-red-600 text-white mic-recording shadow-red-200'
                    : 'bg-agri-800 hover:bg-agri-900 text-white shadow-agri-200'
                }`}
                aria-label="Microphone"
              >
                {isListening ? (
                  <MicOff className="w-14 h-14" />
                ) : (
                  <Mic className="w-14 h-14" />
                )}
              </button>
            </div>

            <p className="text-xs font-semibold text-earth-500">
              {isListening ? t('expenses.tapToStop') : t('expenses.tapToSpeak')}
            </p>

            {/* Transcript Display */}
            {transcript && (
              <div className="mt-4 p-3 bg-cream-50 rounded-xl border border-cream-200 text-earth-800 text-base italic flex items-center justify-center gap-2">
                <Volume2 className="w-4 h-4 text-earth-500 flex-shrink-0" />
                <span>"{transcript}"</span>
              </div>
            )}
          </div>

          {/* CONFIRMATION CARD BEFORE SAVING (Rule FR-VOICE-05) */}
          {parsedResult && (
            <div className="card-farmer bg-cream-50 border-2 border-agri-300 p-5 shadow-md">
              <div className="flex items-center gap-2 mb-3 text-agri-900 font-bold text-lg">
                <Sparkles className="w-5 h-5 text-agri-700" />
                <h3>{t('expenses.confirmVoiceTitle')}</h3>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-earth-700 uppercase mb-1">
                    {t('expenses.item')}
                  </label>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    className="input-farmer bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-earth-700 uppercase mb-1">
                      {t('expenses.amount')}
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input-farmer bg-white font-bold text-lg text-amber-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-earth-700 uppercase mb-1">
                      {t('expenses.category')}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-farmer bg-white capitalize"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>
                          {t(`categories.${cat}`, { defaultValue: cat })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveExpense}
                  disabled={saving}
                  className="btn-primary w-full mt-2"
                >
                  <Check className="w-5 h-5 mr-2" />
                  <span>{saving ? t('common.loading') : t('expenses.confirmAndSave')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL ENTRY FORM */}
      {activeTab === 'manual' && (
        <form onSubmit={handleSaveExpense} className="card-farmer bg-white p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('expenses.item')}
            </label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder={t('expenses.itemPlaceholder')}
              className="input-farmer"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-earth-800 mb-1.5">
                {t('expenses.amount')}
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹ 0"
                className="input-farmer text-lg font-bold text-amber-800"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-earth-800 mb-1.5">
                {t('expenses.category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-farmer capitalize"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`categories.${cat}`, { defaultValue: cat })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('expenses.date')}
            </label>
            <div className="relative">
              <Calendar className="w-5 h-5 text-earth-400 absolute left-3.5 top-4" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-farmer pl-11"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-earth-800 mb-1.5">
              {t('expenses.note')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('expenses.notePlaceholder')}
              className="input-farmer"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full mt-2"
          >
            {saving ? t('common.loading') : t('expenses.saveExpense')}
          </button>
        </form>
      )}
    </div>
  );
};

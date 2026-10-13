/**
 * Helper to format bilingual text like 'వరి (Paddy)' or 'వెంకటేశ్వర్లు (Venkatesh)'
 * or translate known agricultural terms based on active language ('en' vs 'te').
 */

const KNOWN_TERMS = {
  // English -> Translations
  paddy: { en: 'Paddy', te: 'వరి' },
  cotton: { en: 'Cotton', te: 'పత్తి' },
  maize: { en: 'Maize', te: 'మొక్కజొన్న' },
  chilli: { en: 'Chilli', te: 'మిర్చి' },
  warangal: { en: 'Warangal', te: 'వరంగల్' },
  khammam: { en: 'Khammam', te: 'ఖమ్మం' },
  kharif: { en: 'Kharif', te: 'ఖరీఫ్' },
  rabi: { en: 'Rabi', te: 'రబీ' },
  summer: { en: 'Summer', te: 'వేసవి' },
  farmer: { en: 'Farmer', te: 'రైతు' },
  admin: { en: 'Admin', te: 'అడ్మిన్' },
  plot: { en: 'Plot', te: 'పొలం' },

  // Telugu -> Translations
  'వరి': { en: 'Paddy', te: 'వరి' },
  'పత్తి': { en: 'Cotton', te: 'పత్తి' },
  'మొక్కజొన్న': { en: 'Maize', te: 'మొక్కజొన్న' },
  'మిర్చి': { en: 'Chilli', te: 'మిర్చి' },
  'వరంగల్': { en: 'Warangal', te: 'వరంగల్' },
  'ఖమ్మం': { en: 'Khammam', te: 'ఖమ్మం' },
  'ఖరీఫ్': { en: 'Kharif', te: 'ఖరీఫ్' },
  'రబీ': { en: 'Rabi', te: 'రబీ' },
  'వేసవి': { en: 'Summer', te: 'వేసవి' },
  'రైతు': { en: 'Farmer', te: 'రైతు' },
  'అడ్మిన్': { en: 'Admin', te: 'అడ్మిన్' },
  'పొలం': { en: 'Plot', te: 'పొలం' },

  // Seeded / Common Farm Entries
  'గోనె సంచులు మరియు తాళ్ళు': { en: 'Gunny Bags & Ropes', te: 'గోనె సంచులు మరియు తాళ్ళు' },
  'మొక్కజొన్న కలుపు కూలీ': { en: 'Maize Weeding Labour', te: 'మొక్కజొన్న కలుపు కూలీ' },
  'కత్తెర పురుగు మందు పిచికారీ': { en: 'Fall Armyworm Pesticide Spray', te: 'కత్తెర పురుగు మందు పిచికారీ' },
  'కాలువ నీరు పన్ను': { en: 'Canal Water Tax', te: 'కాలువ నీరు పన్ను' },
  'యూరియా మరియు పొటాష్': { en: 'Urea & Potash Fertilizer', te: 'యూరియా మరియు పొటాష్' },
  'పయనీర్ మొక్కజొన్న విత్తనాలు': { en: 'Pioneer Maize Seeds', te: 'పయనీర్ మొక్కజొన్న విత్తనాలు' },
  'ఆటో రవాణా మార్కెట్ కు': { en: 'Auto Transport to Market', te: 'ఆటో రవాణా మార్కెట్ కు' },
  'రెండవ విడత ప్రత్తి కూలీ': { en: 'Second Cotton Picking Labour', te: 'రెండవ విడత ప్రత్తి కూలీ' },
  'గులాబీ రంగు పురుగు మందు': { en: 'Pink Bollworm Pesticide', te: 'గులాబీ రంగు పురుగు మందు' },
  '20:20:0:13 ఎరువులు': { en: '20:20:0:13 Fertilizer', te: '20:20:0:13 ఎరువులు' },
  'రాశి బీటీ ప్రత్తి విత్తనాలు': { en: 'Rasi Bt Cotton Seeds', te: 'రాశి బీటీ ప్రత్తి విత్తనాలు' },
  'BPT 5204 వరి విత్తనాలు': { en: 'BPT 5204 Paddy Seeds', te: 'BPT 5204 వరి విత్తనాలు' },
  'మోటార్ మరమ్మత్తు & డీజిల్': { en: 'Motor Repair & Diesel', te: 'మోటార్ మరమ్మత్తు & డీజిల్' },
  'నాట్లు వేసే కూలీలు': { en: 'Transplanting Labour', te: 'నాట్లు వేసే కూలీలు' },
  'కలుపు తీత కూలీలు': { en: 'Weeding Labour', te: 'కలుపు తీత కూలీలు' },
  'కోత మిషన్': { en: 'Harvester Machine', te: 'కోత మిషన్' },
  'లక్ష్మి కాటన్ జిన్నింగ్ మిల్లు': { en: 'Lakshmi Cotton Ginning Mill', te: 'లక్ష్మి కాటన్ జిన్నింగ్ మిల్లు' },
  'శ్రీనివాస ట్రేడర్స్': { en: 'Srinivasa Traders', te: 'శ్రీనివాస ట్రేడర్స్' },
  'వరంగల్ మార్కెట్': { en: 'Warangal Market', te: 'వరంగల్ మార్కెట్' },
  'ఖమ్మం మార్కెట్': { en: 'Khammam Market', te: 'ఖమ్మం మార్కెట్' },
};

export function formatBilingualText(text, lang = 'te') {
  if (!text || typeof text !== 'string') return text || '';

  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Direct dictionary match
  if (KNOWN_TERMS[clean]) {
    return KNOWN_TERMS[clean][lang] || KNOWN_TERMS[clean].en || clean;
  }
  if (KNOWN_TERMS[lower]) {
    return KNOWN_TERMS[lower][lang] || KNOWN_TERMS[lower].en || clean;
  }

  // 2. Bilingual pattern: 'TeluguPart (EnglishPart)' e.g. 'వరి (Paddy)' or 'వెంకటేశ్వర్లు (Venkatesh)'
  const match = clean.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    const part1 = match[1].trim();
    const part2 = match[2].trim();

    // Check if part 1 has Telugu Unicode characters
    const hasTelugu = /[\u0C00-\u0C7F]/.test(part1);
    const teluguPart = hasTelugu ? part1 : part2;
    const englishPart = hasTelugu ? part2 : part1;

    if (lang === 'en') {
      return englishPart || clean;
    } else {
      return teluguPart || clean;
    }
  }

  return clean;
}

const TELUGU_DIGITS = {
  'ఒకటి': 1,
  'రెండు': 2,
  'మూడు': 3,
  'నాలుగు': 4,
  'ఐదు': 5,
  'ఆరు': 6,
  'ఏడు': 7,
  'ఎనిమిది': 8,
  'తొమ్మిది': 9,
  'పది': 10,
  'ఇరవై': 20,
  'ముప్పై': 30,
  'నలభై': 40,
  'యాభై': 50,
};

const TELUGU_MULTIPLIERS = {
  'వంద': 100,
  'వందలు': 100,
  'వెయ్యి': 1000,
  'వేలు': 1000,
  'వేల': 1000,
};

const ENGLISH_DIGITS = {
  'one': 1,
  'two': 2,
  'three': 3,
  'four': 4,
  'five': 5,
  'six': 6,
  'seven': 7,
  'eight': 8,
  'nine': 9,
  'ten': 10,
  'twenty': 20,
  'thirty': 30,
  'forty': 40,
  'fifty': 50,
};

const ENGLISH_MULTIPLIERS = {
  'hundred': 100,
  'thousand': 1000,
};

const CATEGORY_KEYWORDS = {
  fertilizer: ['urea', 'dap', 'potash', 'fertilizer', 'fertiliser', 'యూరియా', 'ఎరువు', 'ఎరువులు'],
  seeds: ['seed', 'seeds', 'విత్తనాలు', 'విత్తనం', 'విత్తనాల'],
  pesticide: ['pesticide', 'spray', 'పురుగుమందు', 'పురుగు మందు', 'స్ప్రే'],
  labour: ['labour', 'labor', 'coolie', 'కూలీ', 'కూలీలు', 'కూలి'],
  irrigation: ['water', 'diesel', 'motor', 'నీరు', 'డీజిల్', 'మోటార్', 'మోటారు'],
  machinery: ['tractor', 'machinery', 'ట్రాక్టర్', 'ట్రాక్టరు', 'హార్వెస్టర్', 'మిషన్'],
  transport: ['transport', 'lorry', 'రవాణా', 'లారీ', 'ఆటో'],
};

const CURRENCY_WORDS = ['rupees', 'rupee', 'rs', 'inr', 'రూపాయలు', 'రూపాయి', 'రూ'];

/**
 * Extracts numeric amount from text (digits or word numbers)
 */
export function extractAmount(text) {
  if (!text) return { amount: null, matchStr: '' };
  const lower = text.toLowerCase();

  // 1. Direct digits (e.g. 2000, 1500, 800)
  const digitMatch = lower.match(/\b\d+(\.\d+)?\b/);
  if (digitMatch) {
    return {
      amount: parseFloat(digitMatch[0]),
      matchStr: digitMatch[0],
    };
  }

  // 2. Telugu number words (e.g. 'రెండు వేలు' = 2000, 'వెయ్యి' = 1000)
  for (const [unitWord, unitVal] of Object.entries(TELUGU_DIGITS)) {
    for (const [multWord, multVal] of Object.entries(TELUGU_MULTIPLIERS)) {
      const pattern = new RegExp(`${unitWord}\\s+${multWord}`, 'i');
      if (pattern.test(lower)) {
        return {
          amount: unitVal * multVal,
          matchStr: `${unitWord} ${multWord}`,
        };
      }
    }
  }

  // Standalone Telugu multiplier (e.g. 'వెయ్యి' = 1000)
  for (const [multWord, multVal] of Object.entries(TELUGU_MULTIPLIERS)) {
    if (new RegExp(`\\b${multWord}\\b`, 'i').test(lower)) {
      return {
        amount: multVal,
        matchStr: multWord,
      };
    }
  }

  // 3. English number words (e.g. 'two thousand' = 2000)
  for (const [unitWord, unitVal] of Object.entries(ENGLISH_DIGITS)) {
    for (const [multWord, multVal] of Object.entries(ENGLISH_MULTIPLIERS)) {
      const pattern = new RegExp(`\\b${unitWord}\\s+${multWord}\\b`, 'i');
      if (pattern.test(lower)) {
        return {
          amount: unitVal * multVal,
          matchStr: `${unitWord} ${multWord}`,
        };
      }
    }
  }

  // Standalone English multiplier (e.g. 'thousand' = 1000)
  for (const [multWord, multVal] of Object.entries(ENGLISH_MULTIPLIERS)) {
    if (new RegExp(`\\b${multWord}\\b`, 'i').test(lower)) {
      return {
        amount: multVal,
        matchStr: multWord,
      };
    }
  }

  // Standalone English digit
  for (const [unitWord, unitVal] of Object.entries(ENGLISH_DIGITS)) {
    if (new RegExp(`\\b${unitWord}\\b`, 'i').test(lower)) {
      return {
        amount: unitVal,
        matchStr: unitWord,
      };
    }
  }

  return { amount: null, matchStr: '' };
}

/**
 * Identifies category based on keyword matching
 */
export function extractCategory(text) {
  if (!text) return 'other';
  const lower = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return category;
      }
    }
  }
  return 'other';
}

/**
 * Extracts clean item name by stripping amounts and currency words
 */
export function extractItem(text, amountMatchStr) {
  if (!text) return '';
  let cleaned = text;

  // Remove currency words
  for (const cw of CURRENCY_WORDS) {
    const rx = new RegExp(`\\b${cw}\\b`, 'gi');
    cleaned = cleaned.replace(rx, '');
  }

  // Remove amount string if found
  if (amountMatchStr) {
    cleaned = cleaned.replace(new RegExp(amountMatchStr, 'gi'), '');
  }

  // Clean extra spaces and punctuation
  cleaned = cleaned.replace(/[,\.!:;]/g, ' ').replace(/\s+/g, ' ').trim();

  // If after removal nothing is left, return original text trimmed
  if (!cleaned) {
    return text.trim();
  }

  // Capitalize first character
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Main parser entry point
 * @param {string} transcript
 * @param {string} language 'te-IN' | 'en-IN' | 'te' | 'en'
 * @returns {{ item: string, amount: number, category: string, confidence: number }}
 */
export function parseVoiceExpense(transcript, language = 'te') {
  if (!transcript || typeof transcript !== 'string') {
    return {
      item: '',
      amount: 0,
      category: 'other',
      confidence: 0,
    };
  }

  const trimmed = transcript.trim();
  const { amount, matchStr } = extractAmount(trimmed);
  const category = extractCategory(trimmed);
  const item = extractItem(trimmed, matchStr);

  let confidence = 0.5;
  if (amount && amount > 0) confidence += 0.3;
  if (category !== 'other') confidence += 0.2;

  return {
    item: item || (lang.startsWith('te') ? 'వ్యయం' : 'Expense'),
    amount: amount || 0,
    category,
    confidence: Math.min(confidence, 1.0),
  };
}

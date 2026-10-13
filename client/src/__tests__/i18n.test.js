import { describe, it, expect } from 'vitest';
import en from '../i18n/locales/en.json';
import te from '../i18n/locales/te.json';

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

describe('i18n Key Coverage and Parity', () => {
  it('en.json and te.json must have identical keys', () => {
    const enKeys = getKeys(en);
    const teKeys = getKeys(te);

    const missingInTe = enKeys.filter((k) => !teKeys.includes(k));
    const missingInEn = teKeys.filter((k) => !enKeys.includes(k));

    expect(missingInTe).toEqual([]);
    expect(missingInEn).toEqual([]);
    expect(enKeys.length).toBe(teKeys.length);
    expect(enKeys.length).toBeGreaterThan(50);
  });
});

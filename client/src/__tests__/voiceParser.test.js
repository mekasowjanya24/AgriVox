import { describe, it, expect } from 'vitest';
import { parseVoiceExpense } from '../utils/voiceParser.js';

describe('Voice Expense Parser - 10 Required Test Sentences (SRS FR-VOICE-05)', () => {
  it("1. 'bought urea 2000 rupees'", () => {
    const res = parseVoiceExpense('bought urea 2000 rupees', 'en-IN');
    expect(res.category).toBe('fertilizer');
    expect(res.amount).toBe(2000);
    expect(res.item.toLowerCase()).toContain('urea');
  });

  it("2. 'paid labour 1500'", () => {
    const res = parseVoiceExpense('paid labour 1500', 'en-IN');
    expect(res.category).toBe('labour');
    expect(res.amount).toBe(1500);
  });

  it("3. 'seeds 3500 rupees'", () => {
    const res = parseVoiceExpense('seeds 3500 rupees', 'en-IN');
    expect(res.category).toBe('seeds');
    expect(res.amount).toBe(3500);
  });

  it("4. 'యూరియా రెండు వేలు'", () => {
    const res = parseVoiceExpense('యూరియా రెండు వేలు', 'te-IN');
    expect(res.category).toBe('fertilizer');
    expect(res.amount).toBe(2000);
  });

  it("5. 'కూలీ 1500 రూపాయలు'", () => {
    const res = parseVoiceExpense('కూలీ 1500 రూపాయలు', 'te-IN');
    expect(res.category).toBe('labour');
    expect(res.amount).toBe(1500);
  });

  it("6. 'diesel for motor 800'", () => {
    const res = parseVoiceExpense('diesel for motor 800', 'en-IN');
    expect(res.category).toBe('irrigation');
    expect(res.amount).toBe(800);
  });

  it("7. 'pesticide spray two thousand'", () => {
    const res = parseVoiceExpense('pesticide spray two thousand', 'en-IN');
    expect(res.category).toBe('pesticide');
    expect(res.amount).toBe(2000);
  });

  it("8. 'tractor 1200'", () => {
    const res = parseVoiceExpense('tractor 1200', 'en-IN');
    expect(res.category).toBe('machinery');
    expect(res.amount).toBe(1200);
  });

  it("9. 'transport 600 rupees'", () => {
    const res = parseVoiceExpense('transport 600 rupees', 'en-IN');
    expect(res.category).toBe('transport');
    expect(res.amount).toBe(600);
  });

  it("10. 'ఎరువు 2500'", () => {
    const res = parseVoiceExpense('ఎరువు 2500', 'te-IN');
    expect(res.category).toBe('fertilizer');
    expect(res.amount).toBe(2500);
  });
});

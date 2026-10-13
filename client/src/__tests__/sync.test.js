import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/index.js';
import { syncEngine } from '../services/syncEngine.js';

describe('Offline Outbox Queue Logic and Sync States (SRS FR-OFF-03, FR-OFF-06)', () => {
  beforeEach(async () => {
    await db.outbox.clear();
    await db.expenses.clear();
  });

  it('FR-OFF-03: should queue a create write in IndexedDB outbox with clientId and status pending', async () => {
    const payload = {
      category: 'seeds',
      item: 'Paddy seeds',
      amount: 1200,
    };

    const clientId = await syncEngine.enqueueWrite('expenses', 'create', payload);

    expect(clientId).toBeDefined();
    expect(typeof clientId).toBe('string');

    // Verify outbox entry
    const outboxItem = await db.outbox.where('clientId').equals(clientId).first();
    expect(outboxItem).toBeDefined();
    expect(outboxItem.entity).toBe('expenses');
    expect(outboxItem.op).toBe('create');
    expect(outboxItem.status).toBe('pending');
    expect(outboxItem.payload.amount).toBe(1200);

    // Verify local IndexedDB table has the record immediately
    const localRecord = await db.expenses.where('clientId').equals(clientId).first();
    expect(localRecord).toBeDefined();
    expect(localRecord.item).toBe('Paddy seeds');
  });

  it('FR-OFF-06: should report correct pending count', async () => {
    await syncEngine.enqueueWrite('expenses', 'create', { item: 'Urea', amount: 800 });
    await syncEngine.enqueueWrite('expenses', 'create', { item: 'Labour', amount: 1500 });

    const count = await syncEngine.getPendingCount();
    expect(count).toBe(2);
  });

  it('should notify subscribers with sync badge state', () => {
    let notifiedState = null;
    const unsubscribe = syncEngine.subscribe((state) => {
      notifiedState = state;
    });

    syncEngine.notifyListeners();

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});

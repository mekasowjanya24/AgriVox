import { db, generateUUID } from '../db/index.js';
import { api } from '../api/client.js';

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = new Set();
    this.intervalId = null;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processOutboxAndPull();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Run on startup
    if (this.isOnline) {
      setTimeout(() => this.processOutboxAndPull(), 1500);
    }

    // Every 30 seconds
    this.intervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.processOutboxAndPull();
      }
    }, 30000);
  }

  subscribe(listener) {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  notifyListeners() {
    this.getPendingCount().then((pendingCount) => {
      this.syncListeners.forEach((listener) =>
        listener({
          isOnline: this.isOnline,
          isSyncing: this.isSyncing,
          pendingCount,
        })
      );
    });
  }

  async getPendingCount() {
    try {
      return await db.outbox.where('status').notEqual('failed').count();
    } catch {
      return 0;
    }
  }

  // Enqueue local write
  async enqueueWrite(entity, op, payload, clientId = null) {
    const cid = clientId || payload.clientId || generateUUID();
    payload.clientId = cid;
    payload.updatedAt = new Date().toISOString();

    const table = db[entity];
    if (table) {
      if (op === 'create') {
        await table.put(payload);
      } else if (op === 'update') {
        const existing = await table.where('clientId').equals(cid).first();
        if (existing) {
          await table.put({ ...existing, ...payload });
        } else {
          await table.put(payload);
        }
      } else if (op === 'delete') {
        await table.where('clientId').equals(cid).delete();
      }
    }

    await db.outbox.add({
      entity,
      op,
      clientId: cid,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
    });

    this.notifyListeners();

    // Trigger sync if online
    if (this.isOnline && !this.isSyncing) {
      this.processOutboxAndPull();
    }

    return cid;
  }

  async processOutboxAndPull() {
    if (this.isSyncing) return;
    const token = localStorage.getItem('agrivox_token');
    if (!token) return;

    this.isSyncing = true;
    this.notifyListeners();

    try {
      // 1. Send all pending outbox entries in order
      const outboxItems = await db.outbox.orderBy('id').toArray();

      for (const item of outboxItems) {
        if (item.status === 'failed') continue;

        try {
          let serverDoc = null;
          const endpoint = `/${item.entity}`;

          if (item.op === 'create') {
            const res = await api.post(endpoint, item.payload);
            serverDoc = res.data.data;
          } else if (item.op === 'update') {
            const targetId = item.payload._id;
            if (targetId) {
              const res = await api.put(`${endpoint}/${targetId}`, item.payload);
              serverDoc = res.data.data;
            } else {
              const res = await api.post(endpoint, item.payload);
              serverDoc = res.data.data;
            }
          } else if (item.op === 'delete') {
            const targetId = item.payload._id;
            if (targetId) {
              await api.delete(`${endpoint}/${targetId}`);
            }
          }

          // Update IndexedDB with server _id and latest fields
          if (serverDoc && serverDoc._id) {
            const localRecord = await db[item.entity].where('clientId').equals(item.clientId).first();
            if (localRecord) {
              await db[item.entity].put({
                ...localRecord,
                _id: serverDoc._id,
                updatedAt: serverDoc.updatedAt || localRecord.updatedAt,
              });
            }
          }

          // Successfully processed: remove from outbox
          await db.outbox.delete(item.id);
        } catch (itemErr) {
          console.warn(`[SyncEngine] Error syncing item ${item.id}:`, itemErr.message);
          const is4xx = itemErr.response && itemErr.response.status >= 400 && itemErr.response.status < 500;
          if (is4xx) {
            // Validation or permanent error: move to failed state
            await db.outbox.update(item.id, {
              status: 'failed',
              error: itemErr.response?.data?.message || itemErr.message,
            });
          } else {
            // Network error: increment attempts, will retry with backoff next cycle
            await db.outbox.update(item.id, {
              attempts: (item.attempts || 0) + 1,
            });
            break; // Stop outbox processing on network disconnect
          }
        }
      }

      // 2. Pull server changes (FR-OFF-05)
      await this.pullFromServer();
    } catch (err) {
      console.warn('[SyncEngine] Sync failed:', err.message);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  async pullFromServer() {
    try {
      const metaSince = await db.meta.get('lastSyncTimestamp');
      const sinceParam = metaSince?.value || new Date(0).toISOString();

      const res = await api.get(`/sync/pull?since=${encodeURIComponent(sinceParam)}`);
      const { plots, cycles, expenses, harvests, serverTimestamp } = res.data.data;

      // Merge plots
      for (const p of plots || []) {
        await this.upsertLocalRecord('plots', p);
      }

      // Merge cycles
      for (const c of cycles || []) {
        await this.upsertLocalRecord('cycles', c);
      }

      // Merge expenses
      for (const e of expenses || []) {
        await this.upsertLocalRecord('expenses', e);
      }

      // Merge harvests
      for (const h of harvests || []) {
        await this.upsertLocalRecord('harvests', h);
      }

      if (serverTimestamp) {
        await db.meta.put({ key: 'lastSyncTimestamp', value: serverTimestamp });
      }
    } catch (pullErr) {
      console.warn('[SyncEngine] Pull failed:', pullErr.message);
    }
  }

  async upsertLocalRecord(table, doc) {
    const existing = doc.clientId
      ? await db[table].where('clientId').equals(doc.clientId).first()
      : await db[table].where('_id').equals(doc._id).first();

    if (!existing) {
      await db[table].put(doc);
    } else {
      // Last-write-wins by updatedAt
      const localTime = new Date(existing.updatedAt || 0).getTime();
      const serverTime = new Date(doc.updatedAt || 0).getTime();
      if (serverTime >= localTime) {
        await db[table].put({ ...existing, ...doc });
      }
    }
  }
}

export const syncEngine = new SyncEngine();

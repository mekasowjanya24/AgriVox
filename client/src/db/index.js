import Dexie from 'dexie';

export const db = new Dexie('agrivox');

db.version(1).stores({
  plots: '++id, _id, clientId, userId, name, areaAcres, soilType, village, district, updatedAt',
  cycles: '++id, _id, clientId, userId, plotId, crop, season, year, status, updatedAt',
  expenses: '++id, _id, clientId, userId, cycleId, category, item, amount, date, source, updatedAt',
  harvests: '++id, _id, clientId, userId, cycleId, quantityQuintals, pricePerQuintal, date, updatedAt',
  outbox: '++id, entity, op, clientId, payload, createdAt, attempts, status',
  meta: 'key, value',
});

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

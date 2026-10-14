import mongoose from 'mongoose';
import User from '../models/User.js';

let mongoMemoryServer = null;

export const cleanStaleUserIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) return;

    const collections = await db.listCollections({ name: 'users' }).toArray();
    if (collections.length === 0) return;

    const userCollection = db.collection('users');
    const indexes = await userCollection.indexes();

    for (const idx of indexes) {
      const isEmailIndex = idx.name === 'email_1' || (idx.key && idx.key.email);
      const isStale = isEmailIndex && (!idx.partialFilterExpression || !idx.partialFilterExpression.email);
      if (isStale) {
        console.log(`[AgriVox] Safely dropping stale unique index '${idx.name}' on users collection...`);
        await userCollection.dropIndex(idx.name);
        console.log(`[AgriVox] Stale index '${idx.name}' dropped successfully.`);
      }
    }

    await User.syncIndexes();
  } catch (err) {
    console.warn('[AgriVox] Stale user index check notice:', err.message);
  }
};

export const connectDB = async (customUri = null) => {
  const uri = customUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agrivox';
  const isProduction = process.env.NODE_ENV === 'production';

  // Sanitize URI for safe console logging (hide user:password if present)
  const safeUri = uri.replace(/\/\/[^@]+@/, '//***:***@');

  const dbName = process.env.MONGO_DB_NAME || 'agrivox';

  try {
    if (uri && process.env.NODE_ENV !== 'test') {
      // 10s timeout allows MongoDB Atlas cloud handshake and replica set election
      await mongoose.connect(uri, {
        dbName,
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[AgriVox] Successfully connected to MongoDB [database: ${dbName}] at: ${safeUri}`);
      await cleanStaleUserIndexes();
      return;
    }
  } catch (err) {
    console.error(`[AgriVox] MongoDB connection error (${safeUri}):`, err.message);
    if (isProduction || (process.env.MONGO_URI && !uri.includes('127.0.0.1') && process.env.NODE_ENV !== 'test')) {
      // In production or when explicit Atlas MONGO_URI is set, do not silently fallback to ephemeral memory DB
      throw new Error(`Failed to connect to MongoDB Atlas (${safeUri}): ${err.message}`);
    }
    console.warn('[AgriVox] Falling back to In-Memory MongoDB for local development/testing...');
  }

  // Fallback to MongoMemoryServer only in non-production local development/testing
  if (mongoose.connection.readyState === 0 && !isProduction) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri, { dbName });
      console.log(`[AgriVox] Connected to In-Memory MongoDB [database: ${dbName}] at: ${memUri}`);
    } catch (memErr) {
      console.error('[AgriVox] Failed to initialize In-Memory MongoDB:', memErr.message);
      throw memErr;
    }
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  } catch (err) {
    console.error('[AgriVox] Error disconnecting DB:', err.message);
  }
};

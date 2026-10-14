import mongoose from 'mongoose';
import User from '../models/User.js';

let mongoMemoryServer = null;

export const cleanStaleUserIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('[AgriVox] Database connection not ready for index check.');
      return;
    }

    const currentDbName = mongoose.connection.name || (db ? db.databaseName : 'agrivox');
    console.log(`[AgriVox] Checking and cleaning user collection indexes on database: ${currentDbName}...`);

    // Ensure users collection exists so indexes can be checked and synchronized
    const collections = await db.listCollections({ name: 'users' }).toArray();
    if (collections.length === 0) {
      console.log(`[AgriVox] Creating 'users' collection in ${currentDbName} to initialize clean indexes...`);
      await db.createCollection('users');
    }

    const userCollection = db.collection('users');
    const indexes = await userCollection.indexes();

    for (const idx of indexes) {
      // Drop any stale email index (email_1 or key.email)
      const isEmailIndex = idx.name === 'email_1' || (idx.key && idx.key.email);
      if (isEmailIndex) {
        console.log(`[AgriVox] Dropping stale unique index '${idx.name}' on ${currentDbName}.users...`);
        try {
          await userCollection.dropIndex(idx.name);
          console.log(`[AgriVox] Stale index '${idx.name}' dropped successfully.`);
        } catch (dropErr) {
          console.warn(`[AgriVox] Notice dropping index '${idx.name}':`, dropErr.message);
        }
      }
    }

    // Opportunistically check and drop email_1 on 'test' database if accessible on cluster
    try {
      const client = mongoose.connection.getClient ? mongoose.connection.getClient() : mongoose.connection.client;
      if (client && currentDbName !== 'test') {
        const testDb = client.db('test');
        const testCols = await testDb.listCollections({ name: 'users' }).toArray();
        if (testCols.length > 0) {
          const testUserCol = testDb.collection('users');
          const testIndexes = await testUserCol.indexes();
          for (const tIdx of testIndexes) {
            if (tIdx.name === 'email_1' || (tIdx.key && tIdx.key.email)) {
              console.log(`[AgriVox] Dropping stale index '${tIdx.name}' on test.users...`);
              await testUserCol.dropIndex(tIdx.name);
              console.log(`[AgriVox] Stale index '${tIdx.name}' dropped on test.users.`);
            }
          }
        }
      }
    } catch (multiDbErr) {
      // Multi-db sweep is opportunistic; ignore permission differences
    }

    // Synchronize User model indexes (ensures phone_1 unique index is in place)
    await User.syncIndexes();
    console.log('[AgriVox] User indexes synchronized successfully.');
  } catch (err) {
    console.warn('[AgriVox] Stale user index check notice (non-fatal):', err.message);
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

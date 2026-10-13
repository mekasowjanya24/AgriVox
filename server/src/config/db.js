import mongoose from 'mongoose';

let mongoMemoryServer = null;

export const connectDB = async (customUri = null) => {
  const uri = customUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agrivox';
  const isProduction = process.env.NODE_ENV === 'production';

  // Sanitize URI for safe console logging (hide user:password if present)
  const safeUri = uri.replace(/\/\/[^@]+@/, '//***:***@');

  try {
    if (uri) {
      // 10s timeout allows MongoDB Atlas cloud handshake and replica set election
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`[AgriVox] Successfully connected to MongoDB at: ${safeUri}`);
      return;
    }
  } catch (err) {
    console.error(`[AgriVox] MongoDB connection error (${safeUri}):`, err.message);
    if (isProduction || process.env.MONGO_URI) {
      // In production or when explicit MONGO_URI is set, do not silently fallback to ephemeral memory DB
      throw new Error(`Failed to connect to MongoDB Atlas (${safeUri}): ${err.message}`);
    }
    console.warn('[AgriVox] Falling back to In-Memory MongoDB for local development/testing...');
  }

  // Fallback to MongoMemoryServer only in non-production local development
  if (mongoose.connection.readyState === 0 && !isProduction) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`[AgriVox] Connected to In-Memory MongoDB at: ${memUri}`);
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

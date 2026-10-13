import mongoose from 'mongoose';

let mongoMemoryServer = null;

export const connectDB = async (customUri = null) => {
  const uri = customUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agrivox';

  try {
    if (uri) {
      // Try connecting to provided URI with a 2s serverSelectionTimeout
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2500,
      });
      console.log(`[AgriVox] Connected to MongoDB at: ${uri}`);
      return;
    }
  } catch (err) {
    console.warn(`[AgriVox] Could not connect to external MongoDB (${err.message}). Falling back to MongoMemoryServer...`);
  }

  // Fallback to MongoMemoryServer if not connected
  if (mongoose.connection.readyState === 0) {
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

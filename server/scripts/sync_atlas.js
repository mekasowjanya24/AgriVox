import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function syncDatabases() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log('Connected to Atlas cluster.');

  const agrivoxDb = client.db('agrivox');
  const testDb = client.db('test');

  // 1. Sync prices
  const countAgriPrices = await agrivoxDb.collection('prices').countDocuments();
  console.log(`agrivox.prices has ${countAgriPrices} records.`);

  if (countAgriPrices > 0) {
    const prices = await agrivoxDb.collection('prices').find({}).toArray();
    await testDb.collection('prices').deleteMany({});
    const res = await testDb.collection('prices').insertMany(prices);
    console.log(`Inserted ${res.insertedCount} prices into test.prices!`);

    await testDb.collection('prices').createIndex(
      { commodity: 1, market: 1, date: 1 },
      { unique: true }
    );
    console.log('Created index on test.prices');
  }

  // 2. Sync seed users (Admin & Demo Farmer)
  const admin = await agrivoxDb.collection('users').findOne({ phone: '9999999999' });
  const farmer = await agrivoxDb.collection('users').findOne({ phone: '8888888888' });

  if (admin) {
    const adminCopy = { ...admin };
    delete adminCopy._id;
    await testDb.collection('users').updateOne(
      { phone: '9999999999' },
      { $set: adminCopy },
      { upsert: true }
    );
    console.log('Upserted admin into test.users');
  }

  if (farmer) {
    const farmerCopy = { ...farmer };
    delete farmerCopy._id;
    await testDb.collection('users').updateOne(
      { phone: '8888888888' },
      { $set: farmerCopy },
      { upsert: true }
    );
    console.log('Upserted farmer into test.users');
  }

  const testPriceCount = await testDb.collection('prices').countDocuments();
  console.log(`Verification: test.prices now has ${testPriceCount} documents.`);

  await client.close();
}

syncDatabases().catch(console.error);

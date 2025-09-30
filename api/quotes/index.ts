import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
const dbName = process.env.MONGODB_DB || 'fresh-faced';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('quotes');

    if (req.method === 'GET') {
      const quotes = await collection.find({}, { projection: { title: 1, updatedAt: 1 } })
        .sort({ updatedAt: -1 })
        .toArray();
      return res.json(quotes);
    }

    if (req.method === 'POST') {
      const { title, appState, version } = req.body || {};
      if (!title || !appState) {
        return res.status(400).json({ error: 'title and appState are required' });
      }

      // Check duplicate by title
      const existing = await collection.findOne({ title });
      if (existing) {
        return res.status(409).json({ 
          code: 'DUPLICATE_TITLE', 
          message: `Quote with title "${title}" already exists.`, 
          id: existing._id 
        });
      }

      const result = await collection.insertOne({ title, appState, version, updatedAt: new Date() });
      const created = await collection.findOne({ _id: result.insertedId });
      return res.status(201).json(created);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
}

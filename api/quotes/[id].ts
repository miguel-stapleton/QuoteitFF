import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, ObjectId } from 'mongodb';

let client: MongoClient | null = null;

async function getClient() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
  }
  return client;
}

const dbName = process.env.MONGODB_DB || 'fresh-faced';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid quote ID' });
  }

  // Validate ObjectId format
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid quote ID format' });
  }

  try {
    const mongoClient = await getClient();
    const db = mongoClient.db(dbName);
    const collection = db.collection('quotes');

    if (req.method === 'GET') {
      console.log('GET quote by ID:', id);
      const quote = await collection.findOne({ _id: new ObjectId(id) });
      console.log('Found quote:', quote ? 'yes' : 'no');
      if (!quote) {
        console.log('Quote not found for ID:', id);
        return res.status(404).json({ error: 'Not found' });
      }
      return res.json(quote);
    }

    if (req.method === 'PUT') {
      console.log('PUT quote by ID:', id);
      const { title, appState, version } = req.body || {};

      // If updating title, ensure uniqueness across others
      if (title) {
        const conflict = await collection.findOne({ title, _id: { $ne: new ObjectId(id) } });
        if (conflict) {
          return res.status(409).json({ 
            code: 'DUPLICATE_TITLE', 
            message: `Quote with title "${title}" already exists.`, 
            id: conflict._id 
          });
        }
      }

      const updateDoc: any = { updatedAt: new Date() };
      if (title) updateDoc.title = title;
      if (appState) updateDoc.appState = appState;
      if (version) updateDoc.version = version;

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

      if (!result) {
        console.log('Update failed - quote not found for ID:', id);
        return res.status(404).json({ error: 'Not found' });
      }
      console.log('Quote updated successfully');
      return res.json(result);
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(204).send('');
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

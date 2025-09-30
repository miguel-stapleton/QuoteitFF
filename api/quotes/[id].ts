import { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);
const dbName = process.env.MONGODB_DB || 'fresh-faced';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid quote ID' });
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('quotes');

    if (req.method === 'GET') {
      const quote = await collection.findOne({ _id: new ObjectId(id) });
      if (!quote) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.json(quote);
    }

    if (req.method === 'PUT') {
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

      if (!result.value) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.json(result.value);
    }

    if (req.method === 'DELETE') {
      const result = await collection.findOneAndDelete({ _id: new ObjectId(id) });
      if (!result.value) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.status(204).send('');
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
}

import { Router, Request, Response } from 'express';
import { Quote } from '../models/Quote';

export const quotesRouter = Router();

// List quotes (lightweight)
quotesRouter.get('/', async (_req: Request, res: Response) => {
  const quotes = await Quote.find({}, { title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).lean();
  res.json(quotes);
});

// Get quote by id
quotesRouter.get('/:id', async (req: Request, res: Response) => {
  const quote = await Quote.findById(req.params.id).lean();
  if (!quote) return res.status(404).json({ error: 'Not found' });
  res.json(quote);
});

// Create quote
quotesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, appState, version } = req.body || {};
    if (!title || !appState) return res.status(400).json({ error: 'title and appState are required' });

    // Check duplicate by title
    const existing = await Quote.findOne({ title });
    if (existing) {
      return res.status(409).json({ code: 'DUPLICATE_TITLE', message: `Quote with title "${title}" already exists.`, id: existing._id });
    }

    const created = await Quote.create({ title, appState, version });
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Create quote error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update quote by id
quotesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, appState, version } = req.body || {};

    // If updating title, ensure uniqueness across others
    if (title) {
      const conflict = await Quote.findOne({ title, _id: { $ne: req.params.id } });
      if (conflict) {
        return res.status(409).json({ code: 'DUPLICATE_TITLE', message: `Quote with title "${title}" already exists.`, id: conflict._id });
      }
    }

    const updated = await Quote.findByIdAndUpdate(
      req.params.id,
      { $set: { ...(title ? { title } : {}), ...(appState ? { appState } : {}), ...(version ? { version } : {}) } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err: any) {
    console.error('Update quote error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete quote by id
quotesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await Quote.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err: any) {
    console.error('Delete quote error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

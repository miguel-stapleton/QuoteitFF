"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesRouter = void 0;
const express_1 = require("express");
const Quote_1 = require("../models/Quote");
exports.quotesRouter = (0, express_1.Router)();
// List quotes (lightweight)
exports.quotesRouter.get('/', async (_req, res) => {
    const quotes = await Quote_1.Quote.find({}, { title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).lean();
    res.json(quotes);
});
// Get quote by id
exports.quotesRouter.get('/:id', async (req, res) => {
    const quote = await Quote_1.Quote.findById(req.params.id).lean();
    if (!quote)
        return res.status(404).json({ error: 'Not found' });
    res.json(quote);
});
// Create quote
exports.quotesRouter.post('/', async (req, res) => {
    try {
        const { title, appState, version } = req.body || {};
        if (!title || !appState)
            return res.status(400).json({ error: 'title and appState are required' });
        // Check duplicate by title
        const existing = await Quote_1.Quote.findOne({ title });
        if (existing) {
            return res.status(409).json({ code: 'DUPLICATE_TITLE', message: `Quote with title "${title}" already exists.`, id: existing._id });
        }
        const created = await Quote_1.Quote.create({ title, appState, version });
        res.status(201).json(created);
    }
    catch (err) {
        console.error('Create quote error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Update quote by id
exports.quotesRouter.put('/:id', async (req, res) => {
    try {
        const { title, appState, version } = req.body || {};
        // If updating title, ensure uniqueness across others
        if (title) {
            const conflict = await Quote_1.Quote.findOne({ title, _id: { $ne: req.params.id } });
            if (conflict) {
                return res.status(409).json({ code: 'DUPLICATE_TITLE', message: `Quote with title "${title}" already exists.`, id: conflict._id });
            }
        }
        const updated = await Quote_1.Quote.findByIdAndUpdate(req.params.id, { $set: { ...(title ? { title } : {}), ...(appState ? { appState } : {}), ...(version ? { version } : {}) } }, { new: true });
        if (!updated)
            return res.status(404).json({ error: 'Not found' });
        res.json(updated);
    }
    catch (err) {
        console.error('Update quote error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Delete quote by id
exports.quotesRouter.delete('/:id', async (req, res) => {
    try {
        const result = await Quote_1.Quote.findByIdAndDelete(req.params.id);
        if (!result)
            return res.status(404).json({ error: 'Not found' });
        res.status(204).send();
    }
    catch (err) {
        console.error('Delete quote error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment');
}
const connectDB = async () => {
    if (!MONGODB_URI)
        throw new Error('MONGODB_URI not set');
    try {
        await mongoose_1.default.connect(MONGODB_URI, {
            dbName: process.env.MONGODB_DB || 'fresh-faced'
        });
        console.log('MongoDB connected');
    }
    catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    }
};
exports.connectDB = connectDB;

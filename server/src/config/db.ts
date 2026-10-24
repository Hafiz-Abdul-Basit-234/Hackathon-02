import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;
let connectionError: string | null = null;
let lastAttemptUri: string = '';

export async function connectDB(customUri?: string): Promise<{ success: boolean; message: string }> {
  const uri = customUri || ENV.MONGODB_URI;
  lastAttemptUri = uri ? uri.replace(/:([^:@]+)@/, ':****@') : '';

  if (!uri) {
    isConnected = false;
    connectionError = 'MONGODB_URI is not configured in environment variables.';
    console.warn('⚠️ [MongoDB Atlas] MONGODB_URI is not set. Database persistence is disconnected.');
    return { success: false, message: connectionError };
  }

  try {
    if (mongoose.connection.readyState === 1) {
      isConnected = true;
      connectionError = null;
      return { success: true, message: 'Already connected to MongoDB Atlas.' };
    }

    await mongoose.connect(uri, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
});

    isConnected = true;
    connectionError = null;
    console.log('✅ [MongoDB Atlas] Connected successfully to database:', mongoose.connection.name);
    return { success: true, message: `Connected to MongoDB Atlas: ${mongoose.connection.name}` };
  } catch (err: unknown) {
    isConnected = false;
    const msg = err instanceof Error ? err.message : String(err);
    connectionError = `Failed to connect to MongoDB Atlas: ${msg}`;
    console.error('❌ [MongoDB Atlas] Connection Error:', msg);
    return { success: false, message: connectionError };
  }
}

export function getDBStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    databaseName: mongoose.connection.name || null,
    lastAttemptUri,
    connectionError,
  };
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️ [MongoDB Atlas] Connection disconnected.');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  connectionError = err.message;
  console.error('❌ [MongoDB Atlas] Runtime error:', err.message);
});

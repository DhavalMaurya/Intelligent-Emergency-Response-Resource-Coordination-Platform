import mongoose from 'mongoose';
import { env } from './env.js';

export interface DatabaseHealth {
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
  latencyMs?: number;
  databaseName?: string;
  error?: string;
}

let dbHealth: DatabaseHealth = {
  status: 'DISCONNECTED',
};

export const connectDB = async (): Promise<boolean> => {
  dbHealth.status = 'CONNECTING';
  const startTime = Date.now();

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    dbHealth = {
      status: 'CONNECTED',
      latencyMs: Date.now() - startTime,
      databaseName: mongoose.connection.name,
    };

    console.log(`[Database] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return true;
  } catch (error: any) {
    dbHealth = {
      status: 'DISCONNECTED',
      error: error.message,
    };
    console.warn(`[Database] MongoDB connection warning: ${error.message}. Running with fallback state.`);
    return false;
  }
};

mongoose.connection.on('disconnected', () => {
  dbHealth.status = 'DISCONNECTED';
  console.warn('[Database] MongoDB connection lost');
});

mongoose.connection.on('reconnected', () => {
  dbHealth.status = 'CONNECTED';
  console.log('[Database] MongoDB reconnected');
});

export const getDatabaseHealth = async (): Promise<DatabaseHealth> => {
  if (mongoose.connection.readyState === 1) {
    try {
      const start = Date.now();
      await mongoose.connection.db?.admin().ping();
      return {
        status: 'CONNECTED',
        latencyMs: Date.now() - start,
        databaseName: mongoose.connection.name,
      };
    } catch (err: any) {
      return { status: 'ERROR', error: err.message };
    }
  }
  return dbHealth;
};

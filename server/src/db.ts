import mongoose from 'mongoose';

/**
 * The demo must run without MongoDB, so connect() reports failure instead of throwing.
 * Every route falls back to the JSON on disk when `isDbReady()` is false — a dead database
 * degrades the app to exactly the offline mode that is already tested.
 */
let connected = false;

export function isDbReady(): boolean {
  return connected && mongoose.connection.readyState === 1;
}

export async function connectDb(uri: string | undefined, timeoutMs = 5000): Promise<boolean> {
  if (!uri) return false;

  mongoose.connection.on('connected', () => {
    connected = true;
  });
  mongoose.connection.on('disconnected', () => {
    connected = false;
  });
  mongoose.connection.on('error', () => {
    connected = false;
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: timeoutMs,
      // Atlas free tier rejects legacy renegotiation; setting this avoids a 30s hang on connect.
      ssl: uri.includes('mongodb+srv') ? true : undefined,
    });
    return true;
  } catch (error) {
    connected = false;
    console.warn('[db] MongoDB unavailable, serving bundled catalog:', describeError(error));
    return false;
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect().catch(() => undefined);
  connected = false;
}
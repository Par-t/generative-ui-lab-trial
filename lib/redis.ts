import { createClient } from "redis";
import { GameSession } from "./types";

// Create a Redis client using the URL from .env.local
// redis://localhost:6379 is the default local Redis address
const client = createClient({ url: process.env.REDIS_URL });

// Connect once and log errors — the client stays connected for the app's lifetime
client.on("error", (err) => console.error("Redis error:", err));
client.connect();

// How long a session lives in Redis before auto-deleting (1 hour)
const SESSION_TTL = 60 * 60;

// Load a session from Redis by ID
// Returns null if the session doesn't exist (first turn)
export async function getSession(sessionId: string): Promise<GameSession | null> {
  const data = await client.get(`session:${sessionId}`);
  if (!data) return null;
  return JSON.parse(data) as GameSession;
}

// Save a session to Redis
// JSON.stringify converts the object to a string (Redis only stores strings)
// EX sets the TTL — after 1 hour Redis deletes it automatically
export async function saveSession(session: GameSession): Promise<void> {
  await client.set(`session:${session.id}`, JSON.stringify(session), {
    EX: SESSION_TTL,
  });
}

// Save a completed game to a permanent dataset key (no TTL — lives forever)
// Key pattern: dataset:{sessionId}
// These can later be retrieved for persona analysis
export async function saveCompletedGame(session: GameSession): Promise<void> {
  await client.set(`dataset:${session.id}`, JSON.stringify(session));
}

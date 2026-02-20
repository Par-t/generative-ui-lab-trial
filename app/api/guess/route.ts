import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSession, saveSession, saveCompletedGame } from "@/lib/redis";
import { askClaude } from "@/lib/claude";
import { GameSession } from "@/lib/types";

const MAX_TURNS = 20;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, hint } = await req.json();

    // STEP 1: Load existing session from Redis, or create a fresh one
    // If sessionId is null (first turn), we generate a new UUID
    let session: GameSession;

    if (sessionId) {
      const existing = await getSession(sessionId);
      session = existing ?? createNewSession(uuidv4());
    } else {
      session = createNewSession(uuidv4());
    }

    // STEP 2: Append the new hint to the session
    session.hints.push(hint);
    session.turn += 1;

    // STEP 3: Send the FULL session to Claude — all hints, all prior guesses
    // Claude reasons over everything and returns structured JSON
    const claudeResponse = await askClaude(session);

    // STEP 4: Append this turn to the session history
    session.history.push({
      turn: session.turn,
      hint,
      response: claudeResponse,
    });

    // STEP 5: Override status to "timeout" if the turn limit is reached
    // The backend enforces this — Claude doesn't need to count turns
    if (session.turn >= MAX_TURNS && claudeResponse.status === "playing") {
      claudeResponse.status = "timeout";
    }

    // STEP 6: Save the updated session back to Redis
    await saveSession(session);

    // STEP 7: If the game is over, also save to the permanent dataset
    if (claudeResponse.status === "solved" || claudeResponse.status === "timeout") {
      await saveCompletedGame(session);
    }

    // STEP 8: Return the session ID and Claude's response to the frontend
    return NextResponse.json({
      sessionId: session.id,
      response: claudeResponse,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// Helper to create a blank session object
function createNewSession(id: string): GameSession {
  return {
    id,
    turn: 0,
    hints: [],
    history: [],
  };
}

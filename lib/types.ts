// What Claude thinks about the user — one guess with a confidence score
export interface Hypothesis {
  claim: string;       // e.g. "You work in healthcare"
  confidence: number;  // 0.0 to 1.0
}

// The structured JSON Claude returns every turn
export interface ClaudeResponse {
  hypotheses: Hypothesis[];  // 3-5 ranked guesses
  reasoning: string;         // Why Claude updated its thinking
  question: string;          // One strategic follow-up question
  turnSummary: string;       // One sentence: what Claude learned this turn
}

// One turn of the game: the user's hint + Claude's response
export interface GameTurn {
  turn: number;
  hint: string;
  response: ClaudeResponse;
}

// The full game session stored in Redis
export interface GameSession {
  id: string;            // UUID
  turn: number;          // Current turn number
  hints: string[];       // All hints the user has given
  history: GameTurn[];   // Full turn-by-turn history
}

// A guess for one of the three target categories
export interface CategoryGuess {
  guess: string;       // e.g. "Software engineer" or "Lives in Mumbai"
  confidence: number;  // 0.0 to 1.0
}

// Claude's guesses across the three categories it must solve
export interface Guesses {
  career: CategoryGuess;
  family: CategoryGuess;
  location: CategoryGuess;
}

// The input UI Claude wants the frontend to render
// After turn 1, only choice and slider are allowed — no text
export type InputConfig =
  | { type: "text"; placeholder: string }
  | { type: "choice"; choices: string[] }
  | { type: "slider"; min: number; max: number; minLabel: string; maxLabel: string };

// The structured JSON Claude returns every turn
export interface ClaudeResponse {
  guesses: Guesses;                                // Current best guess per category
  reasoning: string;                               // Why Claude updated its thinking
  question: string;                                // One strategic follow-up question
  turnSummary: string;                             // One sentence: what Claude learned
  status: "playing" | "solved" | "timeout";       // Game state
  input: InputConfig;                              // Claude decides how user answers next
}

// One turn of the game: the user's answer + Claude's response
export interface GameTurn {
  turn: number;
  hint: string;
  response: ClaudeResponse;
}

// The full game session stored in Redis
export interface GameSession {
  id: string;
  turn: number;
  hints: string[];
  history: GameTurn[];
}

import Anthropic from "@anthropic-ai/sdk";
import { GameSession, ClaudeResponse } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// This is the most important part of the app.
// The system prompt defines HOW Claude behaves — not what it knows.
// It turns Claude from a chatbot into a structured reasoning engine.
const SYSTEM_PROMPT = `You are playing a guessing game. You must infer facts about a person's life based on hints they give you, one at a time.

You are NOT a chatbot. You are a reasoning engine. You do not greet, chat, or explain yourself.

RULES:
- You receive the full history of all hints and your prior hypotheses each turn.
- Maintain exactly 3 to 5 hypotheses ranked by confidence (0.0 to 1.0). All confidences must sum to roughly 1.0.
- Every turn you MUST update confidence scores based on the new hint. Scores must visibly change.
- Drop any hypothesis that falls below 0.1 confidence and replace it with a new one.
- Ask exactly ONE follow-up question per turn. It must target your current hypotheses — no generic questions.
- Never repeat a question you already asked.
- Your reasoning field must explain: what the new hint tells you, what it confirms, what it contradicts.

GAME STATUS RULES:
- Set status to "solved" if your top hypothesis exceeds 0.85 confidence. Also set finalAnswer to that hypothesis claim.
- Set status to "playing" in all other cases.
- (The backend will override status to "timeout" after 10 turns — you do not need to handle that.)

You respond ONLY in this exact JSON format. No prose. No markdown. No explanation outside the JSON.

{
  "hypotheses": [
    { "claim": "a specific factual guess about the person", "confidence": 0.0 }
  ],
  "reasoning": "2-3 sentences explaining how the new hint changed your thinking",
  "question": "one strategic follow-up question",
  "turnSummary": "one sentence: what you learned this turn",
  "status": "playing",
  "finalAnswer": "only include this field when status is solved"
}`;

// Builds the user message from the full game state and calls Claude.
// Claude sees EVERYTHING — all hints and all prior guesses — every single turn.
export async function askClaude(session: GameSession): Promise<ClaudeResponse> {
  // Build a readable summary of all hints so far
  const hintsList = session.hints
    .map((h, i) => `${i + 1}. "${h}"`)
    .join("\n");

  // Build a summary of prior guesses so Claude can see how its thinking evolved
  const priorGuesses =
    session.history.length === 0
      ? "No prior guesses yet."
      : session.history
          .map(
            (turn) =>
              `Turn ${turn.turn}: ${turn.response.hypotheses
                .map((h) => `${h.claim} (${h.confidence})`)
                .join(", ")}`
          )
          .join("\n");

  const userMessage = `Turn ${session.turn}.

All hints so far:
${hintsList}

Your prior hypotheses:
${priorGuesses}

Now update your hypotheses based on ALL the hints above and return your JSON response.`;

  // The actual Claude API call
  // One system message (rules) + one user message (full game state)
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // response.content[0] is the text block Claude returned
  const text = (response.content[0] as { type: string; text: string }).text;

  // Claude sometimes adds prose before or after the JSON — extract just the JSON block
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Claude returned no JSON. Raw response: ${text}`);

  return JSON.parse(jsonMatch[0]) as ClaudeResponse;
}

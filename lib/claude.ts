import Anthropic from "@anthropic-ai/sdk";
import { GameSession, ClaudeResponse } from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are playing a guessing game. A person gives you one opening hint about themselves, then you ask questions to figure out three things about them:

1. CAREER — What they do for work (e.g. "Software engineer at a startup", "Medical student", "Freelance photographer")
2. FAMILY — Their family situation (e.g. "Single, lives alone", "Married with 2 kids", "Lives with parents and younger sibling")
3. LOCATION — Where they live (e.g. "Mumbai, India", "Small town in Texas", "London, UK")

You are NOT a chatbot. You are a reasoning engine. No greetings, no chat.

QUESTION FORMAT RULES:
- You may ONLY ask questions using "choice" or "slider" input types. NEVER use "text" after the first turn.
- "choice": 2-4 options. You define the options. Good for categorical questions.
- "slider": you define min, max, minLabel, maxLabel. Good for spectrums and quantities.
- Be creative with your question formats. Design choices and slider ranges that maximally narrow down your guesses.
- Every question must target a specific category you are uncertain about.

GUESSING RULES:
- Each turn, update your best guess and confidence (0.0 to 1.0) for ALL three categories.
- Confidence must change every turn based on new evidence.
- Start with low confidence and build up. Do not jump to high confidence early.
- When a category crosses 0.85 confidence, consider it locked in.

GAME STATUS:
- Set status to "solved" ONLY when ALL THREE categories are above 0.85 confidence.
- Otherwise keep status as "playing".
- The backend enforces a 20 turn limit — you do not handle that.

STRATEGY:
- Focus questions on your weakest category first.
- Use slider for "how much / how many" questions.
- Use choice for "which of these" questions.
- Each question should be designed to eliminate possibilities, not confirm what you already know.

Respond ONLY in this exact JSON format. No prose. No markdown.

{
  "guesses": {
    "career": { "guess": "your best guess for their career", "confidence": 0.0 },
    "family": { "guess": "your best guess for their family situation", "confidence": 0.0 },
    "location": { "guess": "your best guess for where they live", "confidence": 0.0 }
  },
  "reasoning": "2-3 sentences: what the new answer tells you, what it confirms or contradicts",
  "question": "your next strategic question",
  "turnSummary": "one sentence: what you learned this turn",
  "status": "playing",
  "input": { "type": "choice", "choices": ["Option A", "Option B", "Option C"] }
}

Other valid input:
{ "type": "slider", "min": 0, "max": 10, "minLabel": "Not at all", "maxLabel": "Extremely" }`;

export async function askClaude(session: GameSession): Promise<ClaudeResponse> {
  const hintsList = session.hints
    .map((h, i) => `${i + 1}. "${h}"`)
    .join("\n");

  const priorGuesses =
    session.history.length === 0
      ? "No prior guesses yet."
      : session.history
          .map(
            (turn) =>
              `Turn ${turn.turn}: Career="${turn.response.guesses.career.guess}" (${turn.response.guesses.career.confidence}), Family="${turn.response.guesses.family.guess}" (${turn.response.guesses.family.confidence}), Location="${turn.response.guesses.location.guess}" (${turn.response.guesses.location.confidence})`
          )
          .join("\n");

  const userMessage = `Turn ${session.turn}.

All answers so far:
${hintsList}

Your prior guesses:
${priorGuesses}

Update your guesses for all three categories and ask your next question. Remember: only use "choice" or "slider" input types.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = (response.content[0] as { type: string; text: string }).text;

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Claude returned no JSON. Raw response: ${text}`);

  return JSON.parse(jsonMatch[0]) as ClaudeResponse;
}

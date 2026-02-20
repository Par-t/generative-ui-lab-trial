# generative-ui-lab-trial (experimental)

A guessing game where Claude tries to figure out your career, family situation, and location — using only structured questions it designs itself.

**This is a prototype** for learning the generative interface pattern: AI controls the UI, not just the content.

## What's implemented

- Claude asks questions via **dynamic input types** it chooses each turn (multiple choice buttons, sliders with custom ranges)
- Three target categories: **Career**, **Family**, **Location** — each with a confidence bar
- Game state persisted in **Redis** across turns
- Game ends when all three categories hit 85% confidence, or after 20 turns
- Completed games saved to Redis as a permanent dataset

## Tech stack

- Next.js (App Router)
- Anthropic Claude API (structured JSON output)
- Redis (session memory)
- TypeScript + Tailwind

## Running locally

```bash
brew install redis
brew services start redis

npm install
# Add your Anthropic API key to .env.local
npm run dev
```

## Architecture

```
Frontend (page.tsx) → POST /api/guess → Load session from Redis
                                      → Send full history to Claude
                                      → Claude returns JSON (guesses + next input type)
                                      → Save to Redis → Return to frontend
```

The frontend is intentionally dumb — it renders whatever Claude returns. Claude decides the question, the input format, the confidence scores, and when the game ends.

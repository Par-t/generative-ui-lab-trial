"use client";

import { useState } from "react";
import { ClaudeResponse, InputConfig, CategoryGuess } from "@/lib/types";

// Renders whatever input type Claude decided on
function DynamicInput({ config, value, onChange, onSubmit, loading }: {
  config: InputConfig;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (directValue?: string) => void;
  loading: boolean;
}) {
  if (config.type === "choice") {
    return (
      <div className="flex flex-wrap gap-2 mb-8">
        {config.choices.map((choice) => (
          <button
            key={choice}
            onClick={() => onSubmit(choice)}
            disabled={loading}
            className="px-5 py-2.5 rounded-full border border-gray-600 hover:border-blue-400 hover:text-blue-400 disabled:opacity-50 text-sm transition-colors"
          >
            {choice}
          </button>
        ))}
      </div>
    );
  }

  if (config.type === "slider") {
    const numVal = value === "" ? Math.round((config.min + config.max) / 2) : Number(value);
    return (
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>{config.minLabel}</span>
          <span className="text-white font-medium text-base">{numVal}</span>
          <span>{config.maxLabel}</span>
        </div>
        <input
          type="range"
          min={config.min}
          max={config.max}
          value={numVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full accent-blue-500"
        />
        <button
          onClick={() => onSubmit(`${numVal} out of ${config.max}`)}
          disabled={loading}
          className="mt-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium text-sm"
        >
          {loading ? "Thinking..." : "Submit"}
        </button>
      </div>
    );
  }

  // Text input — only used for the first turn
  return (
    <div className="flex gap-2 mb-8">
      <input
        className="flex-1 bg-gray-800 rounded px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={config.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        disabled={loading}
      />
      <button
        onClick={() => onSubmit()}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium"
      >
        {loading ? "Thinking..." : "Submit"}
      </button>
    </div>
  );
}

// One category card — shows guess + confidence bar
function CategoryCard({ label, data, locked }: {
  label: string;
  data: CategoryGuess;
  locked: boolean;
}) {
  const pct = Math.round(data.confidence * 100);
  return (
    <div className={`p-4 rounded-lg border ${locked ? "border-green-500/50 bg-green-950/20" : "border-gray-700 bg-gray-900"}`}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs uppercase tracking-widest text-gray-400">{label}</span>
        {locked && <span className="text-xs text-green-400">Locked</span>}
      </div>
      <p className="text-sm font-medium mb-2">{data.guess || "..."}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-800 rounded">
          <div
            className={`h-1.5 rounded transition-all duration-500 ${locked ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [hint, setHint] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [response, setResponse] = useState<ClaudeResponse | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function submitHint(directValue?: string) {
    const finalHint = directValue ?? hint;
    if (!finalHint.trim()) return;
    setLoading(true);

    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, hint: finalHint }),
    });

    const data = await res.json();

    setSessionId(data.sessionId);
    setResponse(data.response);
    setHints((prev) => [...prev, finalHint]);
    setHint("");
    setLoading(false);
  }

  const gameOver = response && response.status !== "playing";

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Who are you?</h1>
      <p className="text-gray-400 mb-6 text-sm">
        Give one hint, then answer Claude&apos;s questions. It will try to guess your career, family, and location.
      </p>

      {/* Turn counter */}
      {response && (
        <p className="text-xs text-gray-500 mb-4">Turn {hints.length} / 20</p>
      )}

      {/* The three category cards */}
      {response && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <CategoryCard label="Career" data={response.guesses.career} locked={response.guesses.career.confidence >= 0.85} />
          <CategoryCard label="Family" data={response.guesses.family} locked={response.guesses.family.confidence >= 0.85} />
          <CategoryCard label="Location" data={response.guesses.location} locked={response.guesses.location.confidence >= 0.85} />
        </div>
      )}

      {/* Game over screen */}
      {gameOver ? (
        <div className="mb-6 p-6 rounded-lg border border-gray-700 bg-gray-900">
          {response.status === "solved" ? (
            <>
              <p className="text-green-400 text-xs uppercase tracking-widest mb-2">All three guessed</p>
              <p className="text-gray-400 text-sm">Claude figured you out in {hints.length} questions.</p>
            </>
          ) : (
            <>
              <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">Time&apos;s up</p>
              <p className="text-gray-400 text-sm">Claude ran out of questions. Check the guesses above.</p>
            </>
          )}
          <button
            onClick={() => { setSessionId(null); setResponse(null); setHints([]); }}
            className="mt-4 text-sm text-blue-400 hover:text-blue-300"
          >
            Play again
          </button>
        </div>
      ) : (
        <>
          {/* Claude's question */}
          {response && (
            <p className="text-sm font-medium mb-3">{response.question}</p>
          )}

          {/* Dynamic input — Claude controls what this renders */}
          <DynamicInput
            config={response?.input ?? { type: "text", placeholder: "Describe yourself in one sentence..." }}
            value={hint}
            onChange={setHint}
            onSubmit={submitHint}
            loading={loading}
          />
        </>
      )}

      {/* Reasoning (collapsible feel — small text) */}
      {response && response.status === "playing" && (
        <div className="mt-4">
          <p className="text-xs text-gray-500">{response.reasoning}</p>
        </div>
      )}

      {/* Answer history */}
      {hints.length > 0 && (
        <div className="mt-8 border-t border-gray-800 pt-4">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2">Your answers</h2>
          <ul className="space-y-1">
            {hints.map((h, i) => (
              <li key={i} className="text-xs text-gray-500">
                {i + 1}. {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

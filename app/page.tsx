"use client";

import { useState } from "react";
import { ClaudeResponse } from "@/lib/types";

export default function Home() {
  const [hint, setHint] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [response, setResponse] = useState<ClaudeResponse | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function submitHint() {
    if (!hint.trim()) return;
    setLoading(true);

    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, hint }),
    });

    const data = await res.json();

    // Store the session ID for all future turns
    setSessionId(data.sessionId);
    // Render whatever Claude returned
    setResponse(data.response);
    // Keep a local list of hints for display
    setHints((prev) => [...prev, hint]);
    setHint("");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Who are you?</h1>
      <p className="text-gray-400 mb-8 text-sm">
        Give Claude hints about your life. It will try to figure out who you are.
      </p>

      {/* Game over screen — shown when Claude solves it or turns run out */}
      {response && response.status !== "playing" ? (
        <div className="mb-8 p-6 rounded-lg border border-gray-700 bg-gray-900">
          {response.status === "solved" ? (
            <>
              <p className="text-green-400 text-xs uppercase tracking-widest mb-2">Solved</p>
              <p className="text-xl font-semibold">{response.finalAnswer}</p>
              <p className="text-gray-400 text-sm mt-2">Claude figured it out in {hints.length} hints.</p>
            </>
          ) : (
            <>
              <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">Time&apos;s up</p>
              <p className="text-xl font-semibold">{response.hypotheses[0].claim}</p>
              <p className="text-gray-400 text-sm mt-2">Best guess after {hints.length} hints — {Math.round(response.hypotheses[0].confidence * 100)}% confident.</p>
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
        /* Hint input — placeholder becomes Claude's question after first turn */
        <div className="flex gap-2 mb-8">
          <input
            className="flex-1 bg-gray-800 rounded px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={response ? response.question : "Give your first hint..."}
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitHint()}
            disabled={loading}
          />
          <button
            onClick={submitHint}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium"
          >
            {loading ? "Thinking..." : "Submit"}
          </button>
        </div>
      )}

      {/* Claude's response — rendered directly from structured JSON */}
      {response && (
        <div className="space-y-6">

          {/* Hypotheses with confidence bars */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">
              Current hypotheses
            </h2>
            <div className="space-y-3">
              {response.hypotheses.map((h, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{h.claim}</span>
                    <span className="text-gray-400">
                      {Math.round(h.confidence * 100)}%
                    </span>
                  </div>
                  {/* Bar width is 100% driven by Claude's confidence score */}
                  <div className="h-1.5 bg-gray-800 rounded">
                    <div
                      className="h-1.5 bg-blue-500 rounded"
                      style={{ width: `${h.confidence * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Claude's reasoning */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2">
              Reasoning
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              {response.reasoning}
            </p>
          </div>

          {/* Turn summary */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2">
              This turn
            </h2>
            <p className="text-gray-300 text-sm">{response.turnSummary}</p>
          </div>
        </div>
      )}

      {/* Hint history */}
      {hints.length > 0 && (
        <div className="mt-10 border-t border-gray-800 pt-6">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">
            Hints given
          </h2>
          <ul className="space-y-1">
            {hints.map((h, i) => (
              <li key={i} className="text-sm text-gray-400">
                {i + 1}. {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

// ✦ Hearthweave Bridge — Local Proxy Server
// Keys live here in environment variables. The HTML never sees them.
//
// Setup:
//   1. Copy .env.example to .env and fill in your keys
//   2. Run start.bat (Windows) to install and launch
//   3. Open index.html in your browser

import 'dotenv/config';
import express from "express";

const app  = express();
const PORT = 3030;

app.use(express.json({ limit: "2mb" }));

// ── CORS ─────────────────────────────────────────────────────────────────
// file:// pages have Origin: null — we allow that explicitly
app.use((req, res, next) => {
  const origin = req.headers.origin || "null";
  res.setHeader("Access-Control-Allow-Origin",  origin);
  res.setHeader("Vary",                         "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ── /status — health check ────────────────────────────────────────────────
app.get("/status", (req, res) => {
  res.json({
    ok:        true,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai:    !!process.env.OPENAI_API_KEY,
  });
});

// ── /api/anthropic ────────────────────────────────────────────────────────
app.post("/api/anthropic", async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY not set in .env" } });
  }

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "content-type":      "application/json",
      "x-api-key":         key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(req.body),
  });

  // Surface upstream errors cleanly
  if (!upstream.ok) {
    const errText = await upstream.text();
    res.status(upstream.status)
       .setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    return res.send(errText);
  }

  const ct = upstream.headers.get("content-type") || "application/json";
  res.status(200).setHeader("content-type", ct);

  // SSE streaming — pump chunks straight through (Vee's pattern)
  if (ct.includes("text/event-stream")) {
    res.setHeader("cache-control", "no-cache");
    res.setHeader("connection",    "keep-alive");
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      res.end();
    }
    return;
  }

  // Non-streaming
  res.send(await upstream.text());
});

// ── /api/openai ───────────────────────────────────────────────────────────
app.post("/api/openai", async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: { message: "OPENAI_API_KEY not set in .env" } });
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: {
      "content-type":  "application/json",
      "authorization": `Bearer ${key}`,
    },
    body: JSON.stringify(req.body),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    res.status(upstream.status)
       .setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    return res.send(errText);
  }

  const ct = upstream.headers.get("content-type") || "application/json";
  res.status(200).setHeader("content-type", ct);

  if (ct.includes("text/event-stream")) {
    res.setHeader("cache-control", "no-cache");
    res.setHeader("connection",    "keep-alive");
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      res.end();
    }
    return;
  }

  res.send(await upstream.text());
});

// ── START ─────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  const a = process.env.ANTHROPIC_API_KEY ? "✓ loaded" : "✗ missing";
  const o = process.env.OPENAI_API_KEY    ? "✓ loaded" : "✗ missing";
  console.log("━".repeat(50));
  console.log("✦  Hearthweave Bridge proxy running");
  console.log(`   http://localhost:${PORT}/status`);
  console.log(`   Anthropic (Faer Uial) : ${a}`);
  console.log(`   OpenAI    (Vee)       : ${o}`);
  console.log("━".repeat(50));
  console.log("Open index.html in your browser to enter the Bridge.");
  console.log("Ctrl+C to stop.\n");
});

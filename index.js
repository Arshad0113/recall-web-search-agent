import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = Number(process.env.PORT || 3001);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "Server API key is not configured." });
    }

    const messages = req.body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
      return res.status(400).json({ error: "Send between 1 and 12 recent messages." });
    }

    const input = [];
    for (const message of messages) {
      if (!["user", "assistant"].includes(message?.role) ||
          typeof message?.content !== "string" ||
          !message.content.trim() || message.content.length > 8000) {
        return res.status(400).json({ error: "A message is invalid or too long." });
      }
      input.push({ role: message.role, content: message.content });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      instructions: [
        "You are Recall, a concise and careful research chat assistant.",
        "Use web search for current, changing, niche, or source-sensitive factual questions.",
        "Do not search when the user is asking for simple writing, brainstorming, or stable general knowledge.",
        "When you search, ground factual claims in the results and cite sources using the citations provided by the platform.",
        "If sources disagree or evidence is weak, say so. Never invent citations, dates, or facts.",
        "Use earlier messages to resolve follow-up references. Be direct and answer the actual question."
      ].join(" "),
      tools: [{ type: "web_search" }],
      input
    });

    const answer = response.output_text || "I couldn't produce a text answer. Please try again.";
    const citations = [];
    for (const item of response.output || []) {
      if (item.type !== "message") continue;
      for (const part of item.content || []) {
        for (const annotation of part.annotations || []) {
          if (annotation.type === "url_citation" && annotation.url) {
            citations.push({
              title: annotation.title || annotation.url,
              url: annotation.url
            });
          }
        }
      }
    }
    const uniqueCitations = [...new Map(citations.map(c => [c.url, c])).values()];
    res.json({ answer, citations: uniqueCitations });
  } catch (error) {
    console.error("Chat request failed:", error?.message || error);
    res.status(500).json({ error: "The agent could not complete that request. Check the server logs and API configuration." });
  }
});

app.listen(port, () => console.log(`Recall API listening on http://localhost:${port}`));

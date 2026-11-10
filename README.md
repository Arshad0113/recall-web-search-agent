# Recall — Web Search Chat Agent

A fast chat agent with exactly one external tool: OpenAI's built-in **web search**.
It keeps a timestamped conversation history in the browser so users can revisit what
they asked and when. The backend receives the recent conversation context on each turn.

## Features
- Web-grounded answers with source citations when search is used.
- One agent tool only: `web_search`.
- Timestamped user and assistant messages.
- Browser-persistent history (localStorage), including a clear-history action.
- Recent context is sent with each request so follow-up questions make sense.
- Responsive React UI and a small Express API.

## Requirements
- Node.js 20+
- OpenAI API key with API access and billing enabled

## Run locally

### 1. Configure the server
```bash
cd server
cp .env.example .env
# Add your OPENAI_API_KEY to server/.env
npm install
npm run dev
```

### 2. Run the frontend (new terminal)
```bash
cd client
npm install
npm run dev
```
Open the URL printed by Vite (normally http://localhost:5173).

## Architecture
- `client/`: React UI, localStorage history, timestamps, chat context.
- `server/`: Express endpoint that calls the OpenAI Responses API.
- `design.md`: design decisions, data flow, trade-offs, and verification plan.

## Environment
`OPENAI_API_KEY` is required. `OPENAI_MODEL` defaults to `gpt-4.1-mini`.
`PORT` defaults to `3001`.

## Important notes
- Do not commit `.env` or expose your API key in frontend code.
- Browser history is local to the browser/device. It is not cloud-synced.
- Web search and model usage may incur API charges. Check current pricing before use.
- For production, add authentication, rate limiting, server-side persistence, and
  abuse monitoring before exposing the API publicly.

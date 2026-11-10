# Design: Recall — a timestamped web-search chat agent

## 1. Goal

Build a responsive chat agent that answers quickly, uses current web information when
needed, and remembers the conversation context plus the time of each user question.
The agent has exactly one external tool: web search.

## 2. Product principles

1. **Ground current claims:** use web search for recent, changing, niche, or source-sensitive
   questions. Prefer primary sources and clearly distinguish sourced facts from uncertainty.
2. **Fast by default:** use a small, fast model by default, keep the recent context window
   bounded, and avoid unnecessary tool use through clear instructions.
3. **Remember visibly:** show local timestamps on every message and preserve the transcript
   across reloads.
4. **Privacy by default:** keep the transcript in the user's browser. The server does not
   create a user profile or database record.
5. **One tool, one responsibility:** the only enabled agent tool is `web_search`.

## 3. Architecture

```text
React client
  |  POST /api/chat { messages: recent transcript }
  v
Express server
  |  OpenAI Responses API
  |  tools = [{ type: "web_search" }]
  v
Model + web search
  |
  v
Answer + source annotations
  |
  v
React renders answer, sources, and timestamps
```

### Client
- Stores messages in `localStorage` under `recall-chat-history-v1`.
- Adds an ISO-8601 timestamp when each user or assistant message is created.
- Sends a bounded recent transcript to the server for follow-up context.
- Renders source links returned by the API.

### Server
- Validates the request shape and message count.
- Keeps the API key server-side.
- Sends the recent transcript to the Responses API.
- Enables only the built-in web search tool.
- Extracts assistant text and URL citations from response annotations.

## 4. Memory model

Each message has:
- `id`: client-generated unique identifier
- `role`: `user` or `assistant`
- `content`: message text
- `createdAt`: ISO-8601 timestamp

The client retains the full transcript locally. For each request, it sends the latest
12 messages (including the current question). This gives the model enough context for
ordinary follow-ups without sending an unbounded history. Older messages remain visible
in the UI, even when they are outside the model context window.

**Limitation:** localStorage is device- and browser-specific. Clearing browser storage
removes this history. Multi-device sync would require authenticated server-side storage.

## 5. Tool policy

The Responses API receives exactly one tool:
- `web_search`

The system instructions tell the model to use search for current or verifiable facts,
cite sources when available, and say when evidence is insufficient. No code execution,
file access, shell, database, or other tools are enabled.

## 6. Speed and reliability

- Default model: `gpt-4.1-mini` (configurable via `OPENAI_MODEL`).
- Bounded context: last 12 messages.
- Request timeout and clear API error handling.
- The UI disables duplicate submissions while a response is pending.
- User messages remain in local history even if the request fails; the UI shows an
  error and allows a retry.

## 7. Security and privacy

- API key is read only by the server from environment variables.
- `.env` is ignored by Git.
- The server validates input and caps message length/count.
- The demo has no authentication or rate limiting. Do not deploy it publicly until
  those controls are added.
- Do not send passwords, payment data, or other sensitive information to the demo.

## 8. Trade-offs and future work

| Decision | Benefit | Trade-off |
|---|---|---|
| Browser localStorage | Simple, private, zero database setup | No cross-device sync |
| Last 12 messages to model | Lower latency and token use | Very old context may be omitted |
| Small default model | Lower latency/cost | Hard questions may need a stronger model |
| Built-in web search | One-tool architecture | Search and model calls have usage costs |

Potential next steps: streaming responses, user authentication, encrypted cloud sync,
conversation search, configurable retention, rate limiting, and automated evaluation.

## 9. Verification checklist

- [ ] Server rejects empty prompts and malformed message arrays.
- [ ] API key is never present in the browser bundle.
- [ ] Only `web_search` is enabled in the Responses API request.
- [ ] A recent-events question returns answer text and source links where provided.
- [ ] A follow-up question uses earlier messages from the same chat.
- [ ] User and assistant messages show timestamps.
- [ ] Refreshing the page restores local history.
- [ ] Clear history removes the stored transcript.
- [ ] Failed requests show an error without silently deleting the user's question.

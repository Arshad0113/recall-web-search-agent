import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowUp, Clock3, Globe2, MessageSquare, Plus, Trash2, Sparkles } from "lucide-react";
import "./style.css";

const STORAGE_KEY = "recall-chat-history-v1";
const makeId = () => crypto.randomUUID();
const timeLabel = (iso) => new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium", timeStyle: "short"
}).format(new Date(iso));

function App() {
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)), [messages]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading]);

  async function send(text = draft) {
    const content = text.trim();
    if (!content || loading) return;
    const userMessage = { id: makeId(), role: "user", content, createdAt: new Date().toISOString() };
    const next = [...messages, userMessage];
    setMessages(next);
    setDraft("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12).map(({ role, content }) => ({ role, content })) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      setMessages(current => [...current, {
        id: makeId(), role: "assistant", content: data.answer,
        citations: data.citations || [], createdAt: new Date().toISOString()
      }]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please retry.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function clearHistory() {
    if (!window.confirm("Clear this conversation from this browser?")) return;
    setMessages([]);
    setError("");
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><span>recall</span></div>
      <button className="new-chat" onClick={() => { setMessages([]); setError(""); }}><Plus size={17}/> New chat</button>
      <div className="side-note"><Clock3 size={15}/><span>Your questions, remembered with time.</span></div>
      <div className="side-bottom">
        <div className="privacy"><span className="status-dot"/> Saved on this device</div>
        <button className="clear-btn" onClick={clearHistory}><Trash2 size={15}/> Clear history</button>
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="mobile-brand"><Sparkles size={17}/> recall</div>
        <div className="mode"><span className="live-dot"/> Web research agent</div>
        <div className="tool-chip"><Globe2 size={14}/> One tool · Web search</div>
      </header>

      <section className="conversation">
        {messages.length === 0 ? <div className="welcome">
          <div className="welcome-icon"><Sparkles size={25}/></div>
          <p className="eyebrow">YOUR RESEARCH COMPANION</p>
          <h1>Ask anything.<br/><span>Keep the context.</span></h1>
          <p className="welcome-copy">Get clear answers grounded in the web. Recall keeps your conversation and the time of every question on this device.</p>
          <div className="suggestions">
            {["What are the latest trends in AI agents?","Explain Java OOP concepts with examples","Find the latest software engineering internships in India"].map(s =>
              <button key={s} onClick={() => send(s)}>{s}<ArrowUp size={14}/></button>
            )}
          </div>
        </div> : <div className="message-list">
          {messages.map(m => <article className={`message ${m.role}`} key={m.id}>
            <div className="avatar">{m.role === "assistant" ? <Sparkles size={16}/> : "You"}</div>
            <div className="message-body">
              <div className="message-meta"><strong>{m.role === "assistant" ? "Recall" : "You"}</strong><time>{timeLabel(m.createdAt)}</time></div>
              <div className="message-text">{m.content}</div>
              {m.citations?.length > 0 && <div className="sources"><span>Sources</span>{m.citations.map((c, i) =>
                <a href={c.url} target="_blank" rel="noreferrer" key={c.url}>{i + 1}. {c.title}</a>
              )}</div>}
            </div>
          </article>)}
          {loading && <div className="message assistant"><div className="avatar"><Sparkles size={16}/></div><div className="message-body"><div className="message-meta"><strong>Recall</strong><span>Searching and thinking</span></div><div className="typing"><i/><i/><i/></div></div></div>}
          <div ref={endRef}/>
        </div>}
      </section>

      <div className="composer-wrap">
        {error && <div className="error-banner">{error} <button onClick={() => send(messages.filter(m => m.role === "user").at(-1)?.content || "")}>Retry</button></div>}
        <form className="composer" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask a question or continue the conversation..." rows="1" maxLength="8000"/>
          <button className="send-btn" type="submit" disabled={!draft.trim() || loading} aria-label="Send message"><ArrowUp size={19}/></button>
        </form>
        <div className="composer-foot"><span><MessageSquare size={12}/> Remembers the last 12 messages for context</span><span>Enter to send · Shift + Enter for new line</span></div>
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById("root")).render(<App/>);

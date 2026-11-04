
import { useState, useRef, useEffect } from "react";

// CHANGE this to your backend address.
// If you have a proxy set up in vite.config.js, use "" (empty) instead.
const API_URL = "http://localhost:5173";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! Ask me about available homes 🏠" },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const updated = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      // skip the first greeting and the new message
      const history = updated.slice(1, -1);

      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      setMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([
        ...updated,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} style={styles.fab}>
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div style={styles.box}>
          <div style={styles.header}>Rental Assistant</div>

          <div style={styles.body}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.msg,
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "#2563eb" : "#e5e7eb",
                  color: m.role === "user" ? "#fff" : "#111",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ ...styles.msg, background: "#e5e7eb", alignSelf: "flex-start" }}>
                Typing...
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={styles.footer}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about homes..."
              style={styles.input}
            />
            <button onClick={send} style={styles.send}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  fab: { position: "fixed", bottom: 20, right: 20, width: 56, height: 56, borderRadius: "50%", border: "none", background: "#2563eb", color: "#fff", fontSize: 22, cursor: "pointer", zIndex: 1000 },
  box: { position: "fixed", bottom: 90, right: 20, width: 320, height: 420, background: "#fff", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,.2)", display: "flex", flexDirection: "column", zIndex: 1000, overflow: "hidden" },
  header: { background: "#2563eb", color: "#fff", padding: 12, fontWeight: 600 },
  body: { flex: 1, padding: 10, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 },
  msg: { padding: "8px 12px", borderRadius: 12, maxWidth: "80%", fontSize: 14 },
  footer: { display: "flex", borderTop: "1px solid #ddd" },
  input: { flex: 1, padding: 10, border: "none", outline: "none" },
  send: { padding: "0 14px", border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" },
};
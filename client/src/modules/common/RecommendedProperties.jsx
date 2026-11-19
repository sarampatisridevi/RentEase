import { useEffect, useState } from "react";

const API_URL = "http://localhost:8001";

// Use <RecommendedProperties propertyId={id} />  → "Similar properties"
// Use <RecommendedProperties userId={user._id} email={user.email} />  → "Recommended for you"
export default function RecommendedProperties({ userId, propertyId, email }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const url = propertyId
      ? `${API_URL}/api/recommend/similar/${propertyId}`
      : `${API_URL}/api/recommend/for-you/${userId}`;
    if (!propertyId && !userId) return;

    fetch(url)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId, propertyId]);

  const emailMe = async () => {
    await fetch(`${API_URL}/api/recommend/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, email }),
    });
    setSent(true);
  };

  if (loading) return <p style={{ color: "#9ca3af" }}>Finding properties for you...</p>;
  if (!items.length) return null;

  return (
    <div style={{ margin: "30px auto", maxWidth: 1000, padding: "0 16px" }}>
      <h2 style={{ color: "#fff" }}>
        {propertyId ? "Similar properties" : "Recommended for you ✨"}
      </h2>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {items.map((p) => (
          <div key={p._id} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: 14, width: 230, color: "#fff" }}>
            <div style={{ fontWeight: 600 }}>{p.propertyAddress}</div>
            <div style={{ color: "#9ca3af", fontSize: 14 }}>{p.propertyType} - {p.propertyAdType}</div>
            <div style={{ margin: "6px 0" }}>₹{p.propertyAmt}</div>
            {p.reason && <div style={{ color: "#a5b4fc", fontSize: 13 }}>💡 {p.reason}</div>}
          </div>
        ))}
      </div>

      {!propertyId && email && (
        <button onClick={emailMe} disabled={sent} style={{ marginTop: 14, padding: "8px 14px", border: "none", borderRadius: 8, background: "#6366f1", color: "#fff", cursor: "pointer" }}>
          {sent ? "Sent! Check your email ✅" : "📧 Email me these"}
        </button>
      )}
    </div>
  );
}
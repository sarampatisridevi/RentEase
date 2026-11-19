const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const Property = require("../models/PropertySchema");        // your real model file name
const PropertyView = require("../models/propertyViewModel");
const { sendEmail } = require("../utils/notify");            // created in Part B

const router = express.Router();
const HIDE = "-ownerContact -ownerName";   // never expose owner details

const lastPart = (addr = "") => addr.split(",").pop().trim().toLowerCase();

const mostCommon = (arr) => {
  const c = {};
  arr.forEach((x) => (c[x] = (c[x] || 0) + 1));
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0];
};

// Scoring: higher = better match
function score(p, profile) {
  let s = 0;
  if (p.propertyType === profile.type) s += 3;
  if (p.propertyAdType === profile.adType) s += 2;
  if (profile.price > 0 && p.propertyAmt > 0) {
    const diff = Math.abs(p.propertyAmt - profile.price) / profile.price;
    s += Math.max(0, 3 - diff * 3);
  }
  if (lastPart(p.propertyAddress) === profile.place) s += 2;
  return s;
}

// Gemini writes one short reason per property (skipped safely if Gemini is busy)
async function explain(profile, items) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const slim = items.map((p) => ({
      id: String(p._id),
      propertyType: p.propertyType,
      propertyAdType: p.propertyAdType,
      propertyAddress: p.propertyAddress,
      propertyAmt: p.propertyAmt,
    }));
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      contents: `User preferences: ${JSON.stringify(profile)}
Properties: ${JSON.stringify(slim)}
For each property write ONE short sentence (max 15 words) on why it suits this user.
Return ONLY a JSON object mapping id to sentence. No markdown.`,
      config: { maxOutputTokens: 400 },
    });
    const clean = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.log("Reasons skipped:", e.status || e.message);
    return {};
  }
}

// Build "recommended for you" from the user's last 10 views
async function buildForYou(userId) {
  const views = await PropertyView.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("propertyId")
    .lean();
  const viewed = views.map((v) => v.propertyId).filter(Boolean);

  if (!viewed.length) {
    const latest = await Property.find({}).sort({ _id: -1 }).limit(4).select(HIDE).lean();
    return { items: latest, profile: null };
  }

  const profile = {
    type: mostCommon(viewed.map((p) => p.propertyType)),
    adType: mostCommon(viewed.map((p) => p.propertyAdType)),
    place: mostCommon(viewed.map((p) => lastPart(p.propertyAddress))),
    price: viewed.reduce((a, p) => a + (p.propertyAmt || 0), 0) / viewed.length,
  };

  const seen = viewed.map((p) => p._id);
  const candidates = await Property.find({ _id: { $nin: seen } }).select(HIDE).lean();
  const items = candidates
    .map((p) => ({ ...p, _score: score(p, profile) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 4);

  return { items, profile };
}

// 1. Save a view
router.post("/view", async (req, res) => {
  try {
    const { userId, propertyId } = req.body;
    if (!userId || !propertyId)
      return res.status(400).json({ message: "userId and propertyId required" });
    await PropertyView.create({ userId, propertyId });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

// 2. Similar properties (for a property details page)
router.get("/similar/:propertyId", async (req, res) => {
  try {
    const base = await Property.findById(req.params.propertyId).lean();
    if (!base) return res.status(404).json({ message: "Property not found" });

    const profile = {
      type: base.propertyType,
      adType: base.propertyAdType,
      price: base.propertyAmt,
      place: lastPart(base.propertyAddress),
    };
    const others = await Property.find({ _id: { $ne: base._id } }).select(HIDE).lean();
    const items = others
      .map((p) => ({ ...p, _score: score(p, profile) }))
      .sort((a, b) => b._score - a._score)
      .slice(0, 4);

    const reasons = await explain(profile, items);
    res.json({ items: items.map((p) => ({ ...p, reason: reasons[String(p._id)] || "" })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ items: [] });
  }
});

// 3. Recommended for a user (home page)
router.get("/for-you/:userId", async (req, res) => {
  try {
    const { items, profile } = await buildForYou(req.params.userId);
    const reasons = profile ? await explain(profile, items) : {};
    res.json({ items: items.map((p) => ({ ...p, reason: reasons[String(p._id)] || "" })) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ items: [] });
  }
});

// 4. Email the recommendations
router.post("/email", async (req, res) => {
  try {
    const { userId, email } = req.body;
    const { items } = await buildForYou(userId);
    const list = items
      .map((p) => `<li><b>${p.propertyType}</b> (${p.propertyAdType}) - ${p.propertyAddress} - ₹${p.propertyAmt}</li>`)
      .join("");
    const ok = await sendEmail(email, "Properties picked for you on RentEase", `<h3>Recommended for you</h3><ul>${list}</ul>`);
    res.json({ ok });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
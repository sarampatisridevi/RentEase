const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const Property = require("../models/PropertySchema");

const router = express.Router();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stops waiting if Gemini does not answer in time
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error("Gemini timeout"), { status: 504 })), ms)
    ),
  ]);

async function askGemini(ai, contents, systemInstruction) {
  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Asking Gemini: ${model}, attempt ${attempt}`);
        const response = await withTimeout(
          ai.models.generateContent({
            model,
            contents,
            config: { systemInstruction, maxOutputTokens: 800 },
          }),
          10000
        );
        return response.text;
      } catch (err) {
        console.log(`Model ${model} attempt ${attempt} failed:`, err.status || err.message);
        if (err.status === 503 || err.status === 429) {
          await sleep(1500); // busy: try the same model again
          continue;
        }
        if (err.status === 504) break; // no answer: move to the next model
        throw err; // other errors (wrong key, wrong model name)
      }
    }
  }
  throw new Error("All Gemini models are busy");
}

router.post("/chat", async (req, res) => {
  try {
    console.log("CHAT REQUEST:", req.body.message);
    const { message, history = [] } = req.body;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Owner details are NOT sent to the AI
    const properties = await Property.find({})
      .select("propertyType propertyAdType propertyAddress propertyAmt additionalInfo isAvailable")
      .limit(30)
      .lean();

    console.log("properties found:", properties.length);

    const systemInstruction = `You are a friendly assistant for a home rental website in India.
Answer ONLY using the property listings below. If nothing matches, say so politely.
Keep replies short (maximum 4 sentences).

Field meanings:
- propertyType: type of property (residential, commercial, land/plot)
- propertyAdType: whether it is for rent or sale
- propertyAddress: location of the property
- propertyAmt: price in rupees
- additionalInfo: extra details about the property
- isAvailable: "Available" or not available

When you mention a property, include its type, address and price (in ₹).
Prefer properties that are Available.
For owner contact details, tell the user to log in and open the property.
If the question is not about properties, politely say you can only help with property questions.

LISTINGS:
${JSON.stringify(properties)}`;

    const contents = [
      ...history.slice(-10).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const reply = await askGemini(ai, contents, systemInstruction);
    console.log("Gemini replied");
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err.status || "", err.message);
    res.json({ reply: "The assistant is very busy right now. Please try again in a moment." });
  }
});

module.exports = router;
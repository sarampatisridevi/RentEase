const express = require("express");
const { GoogleGenAI } = require("@google/genai");
const Property = require("../models/PropertySchema");   // CHANGE to your real model file name

const router = express.Router();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askGemini(ai, contents, systemInstruction) {
  // Tries the main model first, then lighter backups
  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-flash-lite-latest",
  ];

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction, maxOutputTokens: 500 },
        });
        return response.text;
      } catch (err) {
        console.log(`Model ${model}, attempt ${attempt} failed: ${err.status || err.message}`);
        // Only retry when Google is busy or rate limiting
        if (err.status !== 503 && err.status !== 429) throw err;
        await sleep(1500);
      }
    }
  }
  throw new Error("All Gemini models are busy");
}

router.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Create the client here so the .env key is already loaded
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // 1. Get properties from your database
    const properties = await Property.find({})
      .select("propertyType propertyAdType propertyAddress propertyAmt additionalInfo ownerName ownerContact")
      .limit(30)
      .lean();

    console.log("properties found:", properties.length);

    // 2. Instructions for the AI
    const systemInstruction = `You are a friendly assistant for a home rental website in India.
Answer ONLY using the property listings below. If nothing matches, say so politely.
Keep replies short (maximum 4 sentences).

Field meanings:
- propertyType: type of property (house, flat, etc.)
- propertyAdType: whether it is for rent or sale
- propertyAddress: location of the property
- propertyAmt: price in rupees
- additionalInfo: extra details about the property
- ownerName and ownerContact: owner details

When you mention a property, include its type, address and price (in ₹).
Share the owner contact only if the user asks for it.
If the question is not about properties, politely say you can only help with property questions.

LISTINGS:
${JSON.stringify(properties)}`;

    // 3. Convert chat history into Gemini format (Gemini uses "model", not "assistant")
    const contents = [
      ...history.slice(-10).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    // 4. Ask Gemini
    const reply = await askGemini(ai, contents, systemInstruction);
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ reply: "The assistant is very busy right now. Please try again in a moment." });
  }
});

module.exports = router;
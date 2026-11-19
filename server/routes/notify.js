const express = require("express");
const { sendEmail, sendWhatsApp } = require("../utils/notify");

const router = express.Router();

// keeps names from breaking the email HTML
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Test route (keep it)
router.post("/test", async (req, res) => {
  const { email, phone } = req.body;
  const e = email ? await sendEmail(email, "RentEase test", "<p>Email works ✅</p>") : null;
  const w = phone ? await sendWhatsApp(phone, "RentEase test: WhatsApp works ✅") : null;
  res.json({ email: e, whatsapp: w });
});

// Called after a booking is saved
router.post("/booking", async (req, res) => {
  try {
    console.log("BOOKING NOTIFY CALLED:", req.body);
    const { ownerId, propertyAddress, propertyType, propertyAdType, price, bookerName, bookerPhone } = req.body;

    // 1. Find the owner's email (falls back to your own email from .env)
    let ownerEmail = process.env.OWNER_NOTIFY_EMAIL;
    try {
      const User = require("../models/UserSchema"); // CHANGE to your real user model file name
      const owner = await User.findById(ownerId).lean();
      if (owner?.email) ownerEmail = owner.email;
    } catch (e) {
      console.log("Owner lookup skipped, using OWNER_NOTIFY_EMAIL");
    }

    // 2. Email with the booker's details
    const html = `
      <h2>New booking request 🏠</h2>
      <p><b>Property:</b> ${esc(propertyAddress)} (${esc(propertyType)} - ${esc(propertyAdType)})</p>
      <p><b>Price:</b> ₹${esc(price)}</p>
      <hr/>
      <p><b>Booked by:</b> ${esc(bookerName)}</p>
      <p><b>Phone:</b> ${esc(bookerPhone)}</p>
      <p>Log in to RentEase to approve or reject this request.</p>`;

    const emailSent = ownerEmail
      ? await sendEmail(ownerEmail, `New booking request: ${propertyAddress}`, html)
      : false;

    // 3. WhatsApp (only runs after you finish the WhatsApp setup)
    let whatsappSent = false;
    if (process.env.OWNER_NOTIFY_PHONE) {
      whatsappSent = await sendWhatsApp(
        process.env.OWNER_NOTIFY_PHONE,
        `New booking on RentEase!\nProperty: ${propertyAddress}\nName: ${bookerName}\nPhone: ${bookerPhone}`
      );
    }

    res.json({ email: emailSent, whatsapp: whatsappSent });
  } catch (e) {
    console.error("Booking notify error:", e.message);
    res.status(500).json({ email: false, whatsapp: false });
  }
});

module.exports = router;
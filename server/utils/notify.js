const nodemailer = require("nodemailer");
const twilio = require("twilio");

// 10-digit Indian number -> +91..., otherwise just add +
const toIntl = (n) => {
  const d = String(n).replace(/\D/g, "");
  return d.length === 10 ? "+918179760724" + d : "+" + d;
};

async function sendEmail(to, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({ from: `"RentEase" <${process.env.EMAIL_USER}>`, to, subject, html });
    console.log("Email sent to", to);
    return true;
  } catch (e) {
    console.error("Email failed:", e.message);
    return false;
  }
}

async function sendWhatsApp(to, body) {
  try {
    if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) return false;
    const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${toIntl(to)}`,
      body,
    });
    console.log("WhatsApp sent to", to);
    return true;
  } catch (e) {
    console.error("WhatsApp failed:", e.message);
    return false;
  }
}

module.exports = { sendEmail, sendWhatsApp };
import twilio from "twilio";
import { Resend } from "resend";

let resendClient = null;
function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

let twilioClient = null;
function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Sends a plain SMS via Twilio.
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
export async function sendSMS(toPhone, body) {
  const client = getTwilioClient();
  if (!client) throw new Error("Twilio not configured");
  return client.messages.create({
    to: toPhone,
    from: process.env.TWILIO_FROM_NUMBER,
    body,
  });
}

/**
 * Sends a WhatsApp text message via Meta's WhatsApp Cloud API.
 * Requires WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * toPhone must be in international format WITHOUT a leading "+", e.g. "919876543210"
 */
export async function sendWhatsApp(toPhone, body) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error("WhatsApp Cloud API not configured");

  const cleanPhone = toPhone.replace(/[^\d]/g, "");

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "text",
        text: { body },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`WhatsApp send failed: ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Sends an email via Resend.
 * Requires RESEND_API_KEY and REMINDER_FROM_EMAIL.
 * Use Resend's test address ("onboarding@resend.dev") as REMINDER_FROM_EMAIL
 * while developing - no domain verification needed until you go live.
 */
export async function sendEmail(toEmail, subject, body) {
  const client = getResendClient();
  if (!client) throw new Error("Resend not configured");
  const fromEmail = process.env.REMINDER_FROM_EMAIL;
  if (!fromEmail) throw new Error("REMINDER_FROM_EMAIL not set");

  const { error } = await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject,
    text: body,
  });
  if (error) throw new Error(`Email send failed: ${error.message || JSON.stringify(error)}`);
}

/**
 * Reminder channel chain: Email -> WhatsApp -> SMS.
 *
 * Email goes first on purpose right now: WhatsApp Business API approval and
 * Twilio number setup both take real time to get approved, and Resend needs
 * nothing but an API key - so email is what actually works on day one and
 * lets you start serving real clients immediately. WhatsApp and SMS are
 * optional upgrades: add their credentials to .env whenever approval comes
 * through and they'll just start being used automatically, no code changes.
 *
 * This is still self-upgrading either way: whichever channels actually have
 * valid credentials in .env are the ones that succeed, in this priority
 * order. If WHATSAPP_TOKEN/TWILIO_* aren't set yet, those calls fail fast
 * with "not configured" and the chain has already succeeded via email
 * before it even gets to them.
 *
 * `dog` needs `.owner_email` for the Email attempt and `.phone` for the
 * WhatsApp/SMS fallback - either can be missing without breaking the
 * chain, it just means fewer channels are available for that dog.
 */
export async function sendReminderMessage(dog, body, subject) {
  const errors = [];

  if (dog.owner_email) {
    try {
      await sendEmail(dog.owner_email, subject, body);
      return "email";
    } catch (err) {
      errors.push(`Email: ${err.message}`);
    }
  } else {
    errors.push("Email: no owner email on file");
  }

  if (dog.phone) {
    try {
      await sendWhatsApp(dog.phone, body);
      return "whatsapp";
    } catch (err) {
      errors.push(`WhatsApp: ${err.message}`);
    }

    try {
      await sendSMS(dog.phone, body);
      return "sms";
    } catch (err) {
      errors.push(`SMS: ${err.message}`);
    }
  } else {
    errors.push("WhatsApp/SMS: no phone number on file");
  }

  throw new Error(`All channels failed. ${errors.join(" | ")}`);
}

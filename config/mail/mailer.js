import nodemailer from "nodemailer";
import { emitter } from "../../utils/hls/hlsMonitorManager.js";
import { freezeAlertTemplate } from "./templates.js";
import dotenv from "dotenv";

dotenv.config();

/* ===============================
   SMTP CONFIG
================================ */

const {
  SMTP_HOST = "smtp.hostinger.com",
  SMTP_PORT = 587,
  SMTP_USERNAME,
  SMTP_PASSWORD,
  PRODUCTION,
  ALERT_EMAIL = "ashutosh.sharma@ottlive.in"
} = process.env;

if (!SMTP_USERNAME || !SMTP_PASSWORD) {
  console.warn("⚠️ SMTP credentials missing");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: SMTP_PORT == 465,
  auth: {
    user: SMTP_USERNAME,
    pass: SMTP_PASSWORD,
  },
});

/* ===============================
   MAIL SENDER
================================ */

export const sendMail = async ({ to, subject, html, text }) => {
  if (PRODUCTION === "false") {
    console.log("📨 Mail skipped (dev mode):", subject);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"OTT Media Server" <${SMTP_USERNAME}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Mail error:", err.message);
    throw err;
  }
};

/* ===============================
   ALERT DEFINITIONS
================================ */

const ALERT_CONFIG = {
  FREEZE: {
    subject: "Freeze Alert",
    alert: "Freeze Detected",
    color: "orange",
  },
  DARK: {
    subject: "Dark Screen Alert",
    alert: "Dark Screen Detected",
    color: "black",
  },
  OFFLINE: {
    subject: "Offline Alert",
    alert: "Offline Alert",
    color: "red",
  },
  SITE_FREEZE_RECOVERED: {
    subject: "Freeze Recovered",
    alert: "Stream is Back from Freeze",
    color: "green",
  },
  SITE_BLACK_RECOVERED: {
    subject: "Dark Recovered",
    alert: "Stream is Back from Dark Screen",
    color: "green",
  },
  SITE_OFFLINE_RECOVERED: {
    subject: "Offline Recovered",
    alert: "Stream is Back from Offline",
    color: "green",
  },
};

/* ===============================
   EMAIL RATE LIMITING
================================ */

// Rate limiting: Max 1 email per channel per alert type per 5 minutes
const EMAIL_RATE_LIMIT_MS = parseInt(process.env.EMAIL_RATE_LIMIT_MS || "300000"); // 5 minutes default
const emailRateLimit = new Map(); // key: `${channelId}:${type}`, value: timestamp

// Email queue to batch process emails
const emailQueue = [];
let isProcessingQueue = false;
const MAX_EMAILS_PER_BATCH = 10;
const EMAIL_BATCH_DELAY = 2000; // 2 seconds between batches

function canSendEmail(channelId, type) {
  const key = `${channelId}:${type}`;
  const lastSent = emailRateLimit.get(key);
  
  if (!lastSent) {
    return true;
  }
  
  const timeSinceLastEmail = Date.now() - lastSent;
  return timeSinceLastEmail >= EMAIL_RATE_LIMIT_MS;
}

function markEmailSent(channelId, type) {
  const key = `${channelId}:${type}`;
  emailRateLimit.set(key, Date.now());
  
  // Clean up old entries (older than 1 hour) to prevent memory leak
  setTimeout(() => {
    const entry = emailRateLimit.get(key);
    if (entry && Date.now() - entry > 3600000) {
      emailRateLimit.delete(key);
    }
  }, 3600000);
}

async function processEmailQueue() {
  if (isProcessingQueue || emailQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (emailQueue.length > 0) {
    const batch = emailQueue.splice(0, MAX_EMAILS_PER_BATCH);
    
    // Process batch in parallel
    await Promise.allSettled(
      batch.map(async (emailData) => {
        try {
          await sendMail(emailData);
        } catch (err) {
          console.error(`❌ Failed to send queued email:`, err.message);
        }
      })
    );

    // Wait before processing next batch
    if (emailQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, EMAIL_BATCH_DELAY));
    }
  }

  isProcessingQueue = false;
}

/* ===============================
   EVENT LISTENER
================================ */

emitter.on("sendMail", async ({ type, channel, lastTime }) => {
  try {
    const config = ALERT_CONFIG[type];
    if (!config) return;

    const channelId = channel?._id?.toString() || "unknown";

    // Check rate limit
    if (!canSendEmail(channelId, type)) {
      console.log(`⏸️ Email rate limited: ${type} for channel ${channelId}`);
      return;
    }

    const subject = `${config.subject} - ${channel?.name}`;

    const recipients =
      Array.isArray(channel?.support_email) &&
      channel.support_email.length > 0
        ? channel.support_email
        : ALERT_EMAIL;

    const emailData = {
      to: recipients,
      subject,
      html: freezeAlertTemplate({
        alert: config.alert,
        color: config.color,
        alertTime: lastTime,
        streamName: channel?.name,
        streamUrl: channel?.url,
      }),
      text: `${config.subject} - Channel ${channel?.name} at ${lastTime}`,
    };

    // Mark as sent (before queuing to prevent duplicates)
    markEmailSent(channelId, type);

    // Add to queue for batch processing
    emailQueue.push(emailData);
    
    // Trigger queue processing
    processEmailQueue().catch(err => {
      console.error("Error processing email queue:", err);
    });

  } catch (err) {
    console.error(`❌ Failed to queue ${type} mail:`, err.message);
  }
});

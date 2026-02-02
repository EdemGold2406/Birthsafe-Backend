const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL;

// EMAIL CONFIG (GMAIL EXAMPLE)
// You need to set EMAIL_USER and EMAIL_PASS in Render Environment Variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // e.g. birthsafe@gmail.com
    pass: process.env.EMAIL_PASS  // The App Password (not login password)
  }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// --- ROUTE 1: SUBMIT PAYMENT ---
app.post('/api/submit-payment', async (req, res) => {
  try {
    // 1. Get new data points
    const { fullName, plan, whatsapp, telegram, country, state, email, receiptUrl } = req.body;

    // 2. Save to Supabase
    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName, 
        plan_amount: plan, 
        whatsapp_number: whatsapp, 
        telegram_number: telegram,
        country: country,
        state_province: state,
        email: email,
        receipt_url: receiptUrl 
      }])
      .select()
      .single();

    if (error) throw error;

    // 3. Notify Admin Group
    const verifyLink = `${FRONTEND_URL}?id=${data.id}`;
    const message = `
🚨 *New Payment Alert!*
👤 *Name:* ${fullName}
🌍 *Location:* ${state}, ${country}
💰 *Plan:* ${plan}
📧 *Email:* ${email}

👇 *Verify here:*
[Open Dashboard](${verifyLink})
    `;

    await bot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    res.json({ success: true });

  } catch (err) {
    console.error("Submit Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTE 2: VERIFY PAYMENT & SEND EMAIL ---
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status } = req.body;

    // 1. Fetch User Details First (To get Name and Email)
    const { data: user, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Update Status
    await supabase.from('payments').update({ status: status }).eq('id', id);

    // 3. Send Telegram Notification with REAL NAME
    const icon = status === 'verified' ? '✅' : '❌';
    const msg = `Payment for *${user.full_name}* has been marked as *${status.toUpperCase()}* ${icon}`;
    await bot.sendMessage(ADMIN_CHAT_ID, msg, { parse_mode: 'Markdown' });

    // 4. Send Email if Verified
    if (status === 'verified' && user.email) {
      const emailContent = `
        <h3>Hello ${user.full_name},</h3>
        <p>Your payment for the <b>${user.plan_amount}</b> has been successfully verified! ✅</p>
        <p>Here is what you need to get started:</p>
        <ul>
            <li><b>Link to Class:</b> <a href="#">Click here to join</a></li>
            <li><b>Resources:</b> <a href="#">Download PDF</a></li>
        </ul>
        <p>Welcome to the BirthSafe family!</p>
      `;

      await transporter.sendMail({
        from: '"BirthSafe NG" <' + process.env.EMAIL_USER + '>',
        to: user.email,
        subject: 'Payment Verified - Welcome to BirthSafe! 🎉',
        html: emailContent
      });
      console.log(`Email sent to ${user.email}`);
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Verify Error:", err.message);
    res.status(500).json({ error: "Update failed" });
  }
});

// --- CRON JOB: DAILY REPORT AT 1:00 AM WAT (Nigeria) ---
// Render servers are usually UTC. 1 AM Nigeria = 00:00 UTC.
// Cron Pattern: 0 0 * * * (Every day at midnight UTC)
cron.schedule('0 0 * * *', async () => {
  console.log("Running Daily Report...");

  // Get start of yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const dateStr = yesterday.toISOString();

  // Fetch verified payments from last 24h
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'verified')
    .gte('created_at', dateStr);

  if (!payments || payments.length === 0) {
    bot.sendMessage(ADMIN_CHAT_ID, "📊 *Daily Report:* No new verified payments today.");
    return;
  }

  // Calculate Stats
  const totalCount = payments.length;
  // Group by Country/State
  const locations = {};
  payments.forEach(p => {
    const loc = `${p.state_province || 'Unknown'}, ${p.country || 'Unknown'}`;
    locations[loc] = (locations[loc] || 0) + 1;
  });

  let locSummary = "";
  for (const [key, val] of Object.entries(locations)) {
    locSummary += `• ${key}: ${val}\n`;
  }

  const report = `
📊 *Daily Verified Report*
📅 Date: ${new Date().toLocaleDateString()}

✅ *Total Verified:* ${totalCount}

🌍 *Location Breakdown:*
${locSummary}
  `;

  await bot.sendMessage(ADMIN_CHAT_ID, report, { parse_mode: 'Markdown' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

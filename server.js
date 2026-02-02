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

// EMAIL CONFIG
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// --- ROUTE 1: SUBMIT PAYMENT ---
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, whatsapp, telegram, country, state, email, receiptUrl } = req.body;

    // 1. Save to Supabase (We save whatever comes in, frontend handles mapping)
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

    // 2. Notify Admin Group (Telegram Focused)
    const verifyLink = `${FRONTEND_URL}?id=${data.id}`;
    const message = `
🚨 *New Payment Alert!*
👤 ${fullName}
💰 ${plan}
✈️ *Telegram:* \`${telegram}\`
🌍 ${state}, ${country}

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

    // 1. Fetch User Details
    const { data: user, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Update Status
    await supabase.from('payments').update({ status: status }).eq('id', id);

    // 3. Send Telegram Notification
    const icon = status === 'verified' ? '✅' : '❌';
    const msg = `Payment for *${user.full_name}* marked as *${status.toUpperCase()}* ${icon}`;
    await bot.sendMessage(ADMIN_CHAT_ID, msg, { parse_mode: 'Markdown' });

    // 4. Send Email if Verified
    if (status === 'verified' && user.email) {
      const emailContent = `
        <h3>Hello ${user.full_name},</h3>
        <p>Your payment for <b>${user.plan_amount}</b> is confirmed! ✅</p>
        <p>We are excited to have you on board.</p>
        <p>We will contact you via Telegram (${user.telegram_number}) shortly.</p>
      `;

      await transporter.sendMail({
        from: '"BirthSafe NG" <' + process.env.EMAIL_USER + '>',
        to: user.email,
        subject: 'Payment Verified! ✅',
        html: emailContent
      });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Verify Error:", err.message);
    res.status(500).json({ error: "Update failed" });
  }
});

// --- CRON JOB: DAILY REPORT (1 AM NG Time) ---
cron.schedule('0 0 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const dateStr = yesterday.toISOString();

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'verified')
    .gte('created_at', dateStr);

  if (!payments || payments.length === 0) {
    bot.sendMessage(ADMIN_CHAT_ID, "📊 *Daily Report:* No verified payments today.");
    return;
  }

  const totalCount = payments.length;
  // Summary logic...
  const report = `📊 *Daily Verified:* ${totalCount} users.`;
  await bot.sendMessage(ADMIN_CHAT_ID, report, { parse_mode: 'Markdown' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

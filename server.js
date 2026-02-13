const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const { Resend } = require('resend'); // Changed from nodemailer
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- HEALTH CHECK ---
app.get('/', (req, res) => res.send('BirthSafe Backend is Active! 🚀'));

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Initializing Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Bots
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { 
    polling: { params: { timeout: 10 } } 
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- MESSAGE TEMPLATES ---

const getVerifiedEmailStandard = () => `
Welcome, Mama, to Birthsafe School of Pregnancy! 🤝
You have successfully enrolled in the Birth Without Wahala Cohort 14 Program. 

Please, listen to the Inaugural Session replay pinned in the group.
Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).

To complete your registration, please click the link below to fill out the forms:
https://forms.gle/gspjv2jxy1kUsvRM8

Thank you for your cooperation.
`;

const getVerifiedEmail32k = () => `
Welcome, Mama, to Birthsafe School of Pregnancy! 🤝
You have successfully enrolled in the Birth Without Wahala Cohort 14 Program. 

To complete your registration, please click the link below to fill out the forms:
https://forms.gle/gspjv2jxy1kUsvRM8

Bonus Resources: https://birthsafeng.myflodesk.com/bwwps
`;

const getRejectedEmail = (reason) => `
Hello Mama,
We reviewed your payment submission. Unfortunately, it was not verified.
Reason: ${reason}
If you believe this is a mistake, please call: 08123456789
`;

// ... (BRIA_WELCOME_PACKAGE and ADMIN_CONTACT_MSG remain the same)

// --- API ROUTES ---

app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;
    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName, plan_amount: plan, telegram_number: telegramNumber,
        country, state_province: state, email, receipt_urls: receiptUrls 
      }])
      .select().single();

    if (error) throw error;

    const message = `🚨 *New Payment Alert!*\n👤 *Name:* ${fullName}\n💰 *Plan:* ₦${plan}\n✈️ *TG:* \`${telegramNumber}\`\n[Open Dashboard](${FRONTEND_URL}?id=${data.id})`;
    await adminBot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status, reason } = req.body;
    const { data: user } = await supabase.from('payments').select('*').eq('id', id).single();
    await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);

    if (status === 'verified') {
        const amount = parseInt(user.plan_amount.toString().replace(/,/g, ''));
        const textContent = amount >= 32000 ? getVerifiedEmail32k() : getVerifiedEmailStandard();

        // Use Resend to send the email
        await resend.emails.send({
            from: 'BirthSafe NG <onboarding@resend.dev>', // See Note below about custom domains
            to: user.email,
            subject: 'Welcome to BirthSafe! 🤝',
            html: textContent
        });

        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ *${user.full_name}* verified! Email sent.`);
    } else if (status === 'rejected') {
        await resend.emails.send({
            from: 'BirthSafe NG <onboarding@resend.dev>',
            to: user.email,
            subject: 'Payment Verification Update ❌',
            html: getRejectedEmail(reason)
        });
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ *${user.full_name}* rejected. Reason: ${reason}`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Operation failed" });
  }
});

// --- BRIA BOT & CRON (Keep existing code) ---
briaBot.on('message', (msg) => {
    if (msg.new_chat_members) {
        msg.new_chat_members.forEach(m => {
            if(!m.is_bot) briaBot.sendMessage(msg.chat.id, `Welcome @${m.username || m.first_name}! My name is Bria 🌸. DM me /start for your package!`);
        });
    }
    if (msg.chat.type === 'private' && msg.text && !msg.text.startsWith('/start')) {
        briaBot.sendMessage(msg.chat.id, "Hello Mama! 🌸 If you have questions, please tag @Vihktorrr in the group.");
    }
});

briaBot.onText(/\/start/, (msg) => {
    if (msg.chat.type === 'private') briaBot.sendMessage(msg.chat.id, "WELCOME PACKAGE LOGIC HERE...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

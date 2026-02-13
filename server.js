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

// --- HEALTH CHECK ---
app.get('/', (req, res) => res.send('BirthSafe Backend is Active! 🚀'));

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { polling: true });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- EMAIL TEMPLATES ---

const getVerifiedEmail20k = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>To complete your registration, please follow these steps:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use Google Chrome browser</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
`;

const getVerifiedEmail32k = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>To complete your registration, please follow these steps:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use Google Chrome browser</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
<p><a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
`;

const getRejectedEmail = (reason) => `
<p>Hello Mama,</p>
<p>We reviewed your payment submission for the Birth Without Wahala Program.</p>
<p style="color:red;"><b>Unfortunately, it was not verified.</b></p>
<p><b>Reason:</b> ${reason}</p>
<p>If you believe this is a mistake, please call: <b>08123456789</b></p>
<p>Regards,<br>BirthSafe Admin</p>
`;

const BRIA_PACKAGE = `
To new mamas just joining ❤️
Welcome 😊🤗 
You have been added to your cohort.
[...Remaining Instructions Text...]
`;

// --- API ROUTES ---

app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;

    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName, 
        plan_amount: plan, 
        telegram_number: telegramNumber, // Store the number
        country, 
        state_province: state, 
        email, 
        receipt_urls: receiptUrls 
      }])
      .select()
      .single();

    if (error) throw error;

    // Notify Admin Group via Admin Bot
    const verifyLink = `${FRONTEND_URL}?id=${data.id}`;
    const message = `
🚨 *New Payment Alert!*
👤 *Name:* ${fullName}
💰 *Plan:* ₦${plan}
✈️ *Telegram:* \`${telegramNumber}\`
📸 *Receipts:* ${receiptUrls.length}

👇 *Verify here:*
[Open Admin Dashboard](${verifyLink})
    `;

    await adminBot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status, reason } = req.body;

    const { data: user } = await supabase.from('payments').select('*').eq('id', id).single();
    await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);

    if (status === 'verified') {
        let html = parseInt(user.plan_amount) >= 32000 ? getVerifiedEmail32k() : getVerifiedEmail20k();
        await transporter.sendMail({
            from: `"BirthSafe NG" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Welcome to BirthSafe! 🤝',
            html: html
        });
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ Payment for *${user.full_name}* Verified! Email sent.`);
    } else {
        await transporter.sendMail({
            from: `"BirthSafe NG" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Payment Verification Failed ❌',
            html: getRejectedEmail(reason)
        });
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ Payment for *${user.full_name}* Rejected. Reason: ${reason}`);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// --- BRIA BOT ---
briaBot.on('message', (msg) => {
    if (msg.new_chat_members) {
        msg.new_chat_members.forEach(m => {
            if(!m.is_bot) briaBot.sendMessage(msg.chat.id, `Welcome @${m.username || m.first_name}! I am Bria 🌸. DM me /start for your package!`);
        });
    }
    if (msg.chat.type === 'private' && msg.text !== '/start') {
        briaBot.sendMessage(msg.chat.id, "Hello Mama! 🌸 If you have questions, please tag @Vihktorrr in the group.");
    }
});

briaBot.onText(/\/start/, (msg) => {
    if (msg.chat.type === 'private') briaBot.sendMessage(msg.chat.id, BRIA_PACKAGE);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

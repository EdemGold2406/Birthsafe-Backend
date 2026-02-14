const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
require('dotenv').config();

// Import Bria's Brain
const { getBriaAIResponse } = require('./bria');

const app = express();
app.use(express.json());
app.use(cors());

// --- HEALTH CHECK ---
app.get('/', (req, res) => res.send('BirthSafe Backend + Bria AI is Active! 🚀'));

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL; 

// --- BOT INITIALIZATION ---
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { 
    polling: { params: { timeout: 10 } } 
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- EMAIL FUNCTION ---
async function sendEmail(to, subject, htmlBody) {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, htmlBody })
        });
    } catch (error) { console.error("Email Error:", error); }
}

// --- TEMPLATES ---
const getVerifiedEmailStandard = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Program.</p>
<p><b>Step 1: Join your Cohort Telegram Group here: <a href="${tgLink}">${tgLink}</a></b></p>
<p>Once you join, Bria will welcome you!</p>
<p>Click the link below to fill out the forms: <a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
`;

const getVerifiedEmail32k = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Program.</p>
<p><b>Step 1: Join your Cohort Telegram Group here: <a href="${tgLink}">${tgLink}</a></b></p>
<p>Access your bonus resources here: <a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
<p>Click the link below to fill out the forms: <a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
`;

const getRejectedEmail = (reason) => `<p>Hello Mama, your payment verification failed. Reason: ${reason}</p>`;

const BRIA_WELCOME_PACKAGE = `
Welcome Mama! 😊🤗 
You have been added to your cohort, Birth Without Wahala. 

Access to your materials takes about 24hrs-48hrs after you fill the Google form.
While you wait, please:
1. Create a Selar account.
2. Join the Online Event Centre: https://t.me/+FiZMxogFUXAzZGE0
3. Join the Consult Session Replays: https://t.me/+cIx-kOJwyVJiMjZk

I am here to help! Tag me if you have questions. ❤️
`;

// --- API ROUTES ---
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;
    const { data, error } = await supabase.from('payments').insert([{ 
        full_name: fullName, plan_amount: plan, telegram_number: telegramNumber,
        country, state_province: state, email, receipt_urls: receiptUrls 
    }]).select().single();
    if (error) throw error;

    const message = `🚨 <b>New Payment Alert!</b>\n👤 <b>Name:</b> ${fullName}\n💰 <b>Plan:</b> ₦${plan}\n<a href="${FRONTEND_URL}?id=${data.id}">Open Dashboard</a>`;
    await adminBot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'HTML' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status, reason } = req.body;
    const { data: user } = await supabase.from('payments').select('*').eq('id', id).single();
    await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);

    if (status === 'verified') {
        const { data: set } = await supabase.from('app_settings').select('value').eq('id', 'active_cohort_link').single();
        const tgLink = set ? set.value : "https://t.me/birthsafe_admin";
        const html = parseInt(user.plan_amount.toString().replace(/,/g, '')) >= 32000 ? getVerifiedEmail32k(tgLink) : getVerifiedEmailStandard(tgLink);
        sendEmail(user.email, 'Welcome to BirthSafe! 🤝', html);
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ <b>${user.full_name}</b> verified!`, { parse_mode: 'HTML' });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// --- BRIA BOT LOGIC ---
briaBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const isPrivate = msg.chat.type === 'private';

    // 1. WELCOME TAG IN GROUP
    if (msg.new_chat_members) {
        msg.new_chat_members.forEach(m => {
            if(!m.is_bot) {
                briaBot.sendMessage(chatId, `Welcome Mama @${m.username || m.first_name} to the BirthSafe family! 🌸\n\nI am Bria, part of Dr. Idara's team. Please DM me and click START to receive your full welcome package!`);
            }
        });
        return;
    }

    if (!text) return;

    // 2. DM START COMMAND
    if (isPrivate && text.startsWith('/start')) {
        return briaBot.sendMessage(chatId, BRIA_WELCOME_PACKAGE);
    }

    // 3. AI INTERACTION (DMs or Tags in Group)
    const botMe = await briaBot.getMe();
    const isMentioned = text.includes(`@${botMe.username}`);
    const isReply = msg.reply_to_message && msg.reply_to_message.from.id === botMe.id;

    if (isPrivate || isMentioned || isReply) {
        briaBot.sendChatAction(chatId, 'typing');
        const cleanQuery = text.replace(`@${botMe.username}`, '').trim();
        const aiResponse = await getBriaAIResponse(cleanQuery);
        
        briaBot.sendMessage(chatId, aiResponse, { 
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

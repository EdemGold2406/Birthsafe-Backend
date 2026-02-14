const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
require('dotenv').config();

// Import the AI Brain we just created
const { getBriaAIResponse } = require('./bria');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('BirthSafe System + AI Bria is Online! 🚀'));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { polling: { params: { timeout: 10 } } });

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- HELPERS ---
async function getActiveCohortLink() {
    try {
        const { data } = await supabase.from('app_settings').select('value').eq('id', 'active_cohort_link').single();
        return data ? data.value : "https://t.me/birthsafe_admin";
    } catch (e) { return "https://t.me/birthsafe_admin"; }
}

async function sendEmail(to, subject, htmlBody) {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, htmlBody })
        });
    } catch (e) { console.error("Email Error:", e); }
}

// --- TEMPLATES ---
const getVerifiedEmailStandard = (tgLink) => `<p>Welcome Mama! Join your group here: <a href="${tgLink}">${tgLink}</a>. Then fill this form: https://forms.gle/gspjv2jxy1kUsvRM8</p>`;
const getVerifiedEmail32k = (tgLink) => `<p>Welcome Mama! Join your group here: <a href="${tgLink}">${tgLink}</a>. Bonus link: https://birthsafeng.myflodesk.com/bwwps. Then fill this form: https://forms.gle/gspjv2jxy1kUsvRM8</p>`;
const getRejectedEmail = (reason) => `<p>Verification failed. Reason: ${reason}. Please contact mamacarebirthsafe@gmail.com</p>`;

// --- API ROUTES ---
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;
    const { data, error } = await supabase.from('payments').insert([{ full_name: fullName, plan_amount: plan, telegram_number: telegramNumber, country, state_province: state, email, receipt_urls: receiptUrls }]).select().single();
    if (error) throw error;
    const msg = `🚨 <b>New Payment Alert!</b>\n👤 <b>Name:</b> ${fullName}\n💰 <b>Plan:</b> ₦${plan}\n<a href="${FRONTEND_URL}?id=${data.id}">Open Dashboard</a>`;
    await adminBot.sendMessage(ADMIN_CHAT_ID, msg, { parse_mode: 'HTML' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status, reason } = req.body;
    const { data: user } = await supabase.from('payments').select('*').eq('id', id).single();
    await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);
    if (status === 'verified') {
        const tgLink = await getActiveCohortLink();
        const html = parseInt(user.plan_amount.toString().replace(/,/g, '')) >= 32000 ? getVerifiedEmail32k(tgLink) : getVerifiedEmailStandard(tgLink);
        sendEmail(user.email, 'Welcome to BirthSafe! 🤝', html);
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ <b>${user.full_name}</b> verified!`, { parse_mode: 'HTML' });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// --- BRIA AI BOT LOGIC ---
briaBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const isPrivate = msg.chat.type === 'private';

    // 1. Welcome Tag in Group
    if (msg.new_chat_members) {
        msg.new_chat_members.forEach(m => {
            if(!m.is_bot) {
                briaBot.sendMessage(chatId, `Welcome Mama @${m.username || m.first_name} to BirthSafe! 🌸\n\nI am Bria, part of Dr. Idara's team. Please DM me and click START to receive your welcome package!`);
            }
        });
        return;
    }

    if (!text) return;

    // 2. Start Command
    if (isPrivate && text.startsWith('/start')) {
        return briaBot.sendMessage(chatId, "Welcome Mama! ❤️ I'm Bria. I've sent your full welcome package to your email, but you can also find the pinned messages in the group for immediate steps. How can I help you today?");
    }

    // 3. AI Interaction (Mentions in group or any DM)
    const botMe = await briaBot.getMe();
    const isMentioned = text.includes(`@${botMe.username}`);
    const isReply = msg.reply_to_message && msg.reply_to_message.from.id === botMe.id;

    if (isPrivate || isMentioned || isReply) {
        briaBot.sendChatAction(chatId, 'typing');
        const cleanQuery = text.replace(`@${botMe.username}`, '').trim();
        
        // Call the AI Brain
        const aiResponse = await getBriaAIResponse(cleanQuery);
        
        briaBot.sendMessage(chatId, aiResponse, { 
            parse_mode: 'Markdown',
            reply_to_message_id: msg.message_id 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BirthSafe Backend + AI Bria running on port ${PORT}`));

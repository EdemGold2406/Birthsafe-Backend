const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- HEALTH CHECK ---
app.get('/', (req, res) => res.send('BirthSafe System + AI Bria is Online! 🚀'));

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- AI CONFIGURATION (Bria's Brain) ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const BRIA_KNOWLEDGE = `
You are Bria, the warm, motherly, and professional AI Assistant for BirthSafe Nigeria. 
You work directly under the leadership of our founder, Dr. Idara. 

TONE & PERSONALITY:
- Always address the user as "Mama". 
- Use Nigerian professional warmth (e.g., "Blessing to you," "No wahala," "Safe delivery").
- You are not just a bot; you are a supportive team member at BirthSafe.

BIRTHSAFE PROTOCOLS (Your Source of Truth):
- Founder: Dr. Idara.
- Materials: Access takes 24-48 working hours after filling the Google form.
- PCV Rule: If PCV is less than 36%, Mamas MUST watch the Supplements Protocol and join the PCV Challenge.
- Injury Timer: Mamas join this group at 35/36 weeks for Sunday NIL sessions.
- Consultations: Every Sunday at 7pm in the 'Online Event Centre'.
- Selar Account: Required to access all materials.
- Packages: Partial (N20,800), Standard (N25,500), Pregnancy Safeguarding (N32,000).

CORE RULES:
1. MEDICAL SAFETY: You are an AI, not a doctor. If a Mama mentions an emergency (bleeding, no movement, severe pain, water breaking), tell her to go to the hospital IMMEDIATELY.
2. GENERAL QUESTIONS: If asked about hospitals (e.g., in Calabar, Lagos, etc.) or diet, provide a helpful answer based on your AI knowledge but always add: "Generally, [Answer], but Dr. Idara always advises following our specific BirthSafe guides for the best results."
3. ESCALATION: For payment issues or things you don't know, tell them to tag our admin @Vihktorrr.
`;

// --- BOT INITIALIZATION ---
// Admin Bot: For payment notifications
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });

// Bria Bot: For community interaction
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { 
    polling: { params: { timeout: 10 } } 
});

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

async function getBriaAIResponse(userMessage) {
    try {
        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: "Instructions: " + BRIA_KNOWLEDGE }] },
                { role: "model", parts: [{ text: "Understood, Mama! I am Bria, part of Dr. Idara's team. I am ready to help our Mamas with warmth and care." }] },
            ],
        });
        const result = await chat.sendMessage(userMessage);
        return result.response.text();
    } catch (error) {
        console.error("AI Error:", error);
        return "I'm so sorry Mama, my brain is a bit tired. Please tag @Vihktorrr for help! ❤️";
    }
}

// --- API ROUTES (Payment System) ---

app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;
    const { data, error } = await supabase.from('payments').insert([{ 
        full_name: fullName, plan_amount: plan, telegram_number: telegramNumber, 
        country, state_province: state, email, receipt_urls: receiptUrls 
    }]).select().single();

    if (error) throw error;

    const msg = `🚨 <b>New Payment Alert!</b>\n👤 <b>Name:</b> ${fullName}\n💰 <b>Plan:</b> ₦${plan}\n✈️ <b>TG:</b> <code>${telegramNumber}</code>\n<a href="${FRONTEND_URL}?id=${data.id}">Open Dashboard</a>`;
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
        const amount = parseInt(user.plan_amount.toString().replace(/,/g, ''));
        const html = amount >= 32000 ? 
            `<p>Welcome Mama! You are verified for the Pregnancy Safeguarding Package. Join here: ${tgLink}</p>` : 
            `<p>Welcome Mama! You are verified. Join here: ${tgLink}</p>`;
        
        sendEmail(user.email, 'Welcome to BirthSafe! 🤝', html);
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ <b>${user.full_name}</b> has been verified!`, { parse_mode: 'HTML' });
    } else {
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ <b>${user.full_name}</b> rejected. Reason: ${reason}`, { parse_mode: 'HTML' });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// --- BRIA BOT LOGIC (Community AI) ---

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

    // 2. /start command
    if (isPrivate && text.startsWith('/start')) {
        const welcomePkg = `Welcome Mama! ❤️ I'm Bria. I'm here to help you through your Birth Without Wahala journey. 
        
Please check your onboarding email for full details. You can also find pinned messages in the group for immediate steps. How can I help you today?`;
        return briaBot.sendMessage(chatId, welcomePkg);
    }

    // 3. AI Interaction (Mentions or DMs)
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

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`BirthSafe System running on port ${PORT}`);
});

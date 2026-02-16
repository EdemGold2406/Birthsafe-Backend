const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
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

// --- AI CONFIGURATION (Updated Model String) ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash-latest", // Use latest to ensure endpoint availability
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
});

const BRIA_KNOWLEDGE = `
You are Bria, the warm, motherly, and professional AI Assistant for BirthSafe Nigeria. 
You work directly under the leadership of our founder, Dr. Idara. 

TONE & PERSONALITY:
- Always address the user as "Mama". 
- Use Nigerian professional warmth (e.g., "Blessing to you," "No wahala," "Safe delivery").
- You are an integral team member, helpful and safe.

BIRTHSAFE PROTOCOLS:
- Founder: Dr. Idara.
- Materials: Access takes 24-48 working hours after filling the Google form.
- PCV Rule: If PCV is less than 36%, Mamas MUST watch the Supplements Protocol and join the PCV Challenge.
- Injury Timer: Mamas join this group at 35/36 weeks for Sunday NIL sessions.
- Consultations: Every Sunday at 7pm in the 'Online Event Centre'.
- Selar Account: Required to access all materials.
- Packages: Partial (N20,800), Standard (N25,500), Pregnancy Safeguarding (N32,000).

CORE RULES:
1. EMERGENCY: If a Mama mentions bleeding, severe pain, or no movement, tell her to go to the hospital IMMEDIATELY.
2. HYBRID ANSWERS: Provide helpful general advice, but always mention that Dr. Idara suggests following BirthSafe protocols.
3. ESCALATION: For tech or payment wahala, tag @Vihktorrr.
`;

// --- BOT INITIALIZATION ---
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

// --- AI RESPONSE LOGIC (FIXED) ---
async function getBriaAIResponse(userMessage) {
    try {
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

        // Generate content using a single prompt structure (more stable than Chat history on some versions)
        const fullPrompt = `${BRIA_KNOWLEDGE}\n\nUser Question: ${userMessage}\nBria's Response:`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("--- REAL GEMINI ERROR LOG ---");
        console.error(error.message);
        return "I'm so sorry Mama, my brain is a bit tired. Please tag @Vihktorrr for help! ❤️";
    }
}

// --- EMAIL TEMPLATES ---
const getVerifiedEmailStandard = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group.</p>
<p>Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p><b>To complete your registration:</b></p>
<p>1. Join your Group: <a href="${tgLink}">${tgLink}</a></p>
<p>2. Fill the form: <a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation!</p>
`;

const getVerifiedEmail32k = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Program.</p>
<p><b>Step 1: Join your Group: <a href="${tgLink}">${tgLink}</a></b></p>
<p><b>Step 2: Fill the Form: <a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></b></p>
<p><b>Step 3: Safeguarding Resources: <a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></b></p>
<p>Thank you!</p>
`;

const getRejectedEmail = (reason) => `<p>Verification Failed. Reason: ${reason}</p>`;

const BRIA_DM_PACKAGE = `To new mamas just joining ❤️\nWelcome 😊🤗\n\nFull details are in your onboarding email!`;

// --- API ROUTES ---
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;
    const { data, error } = await supabase.from('payments').insert([{ full_name: fullName, plan_amount: plan, telegram_number: telegramNumber, country, state_province: state, email, receipt_urls: receiptUrls }]).select().single();
    if (error) throw error;
    const msg = `🚨 <b>New Payment!</b>\n👤 ${fullName}\n💰 ₦${plan}\n<a href="${FRONTEND_URL}?id=${data.id}">Open Dashboard</a>`;
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
        let html = (amount >= 32000) ? getVerifiedEmail32k(tgLink) : getVerifiedEmailStandard(tgLink);
        sendEmail(user.email, 'Welcome to BirthSafe! 🤝', html);
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ <b>${user.full_name}</b> verified!`, { parse_mode: 'HTML' });
    } else if (status === 'rejected') {
        sendEmail(user.email, 'Verification Update ❌', getRejectedEmail(reason));
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ <b>${user.full_name}</b> REJECTED.`, { parse_mode: 'HTML' });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// --- BRIA BOT LOGIC ---
briaBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const isPrivate = msg.chat.type === 'private';

    if (msg.new_chat_members) {
        msg.new_chat_members.forEach(m => {
            if(!m.is_bot) briaBot.sendMessage(chatId, `Welcome Mama @${m.username || m.first_name} to BirthSafe! 🌸\n\nDM me /start for your package!`);
        });
        return;
    }

    if (!text) return;
    if (isPrivate && text.startsWith('/start')) return briaBot.sendMessage(chatId, BRIA_DM_PACKAGE);

    const botMe = await briaBot.getMe();
    const isMentioned = text.includes(`@${botMe.username}`);
    const isReply = msg.reply_to_message && msg.reply_to_message.from.id === botMe.id;

    if (isPrivate || isMentioned || isReply) {
        briaBot.sendChatAction(chatId, 'typing');
        const aiResponse = await getBriaAIResponse(text.replace(`@${botMe.username}`, '').trim());
        briaBot.sendMessage(chatId, aiResponse, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BirthSafe Backend running on port ${PORT}`));

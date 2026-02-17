const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- HEALTH CHECK ---
app.get('/', (req, res) => res.send('BirthSafe System + Bria (Groq Llama 3.3) is Online! 🚀'));

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// --- AI CONFIGURATION (Groq) ---
const groq = new Groq({ apiKey: GROQ_API_KEY });

const BRIA_SYSTEM_PROMPT = `
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
2. HYBRID ANSWERS: For general pregnancy advice, give a helpful AI answer but always mention that Dr. Idara suggests following BirthSafe's specific protocols.
3. ESCALATION: For tech or payment wahala, tell them to tag our admin @Vihktorrr.
`;

// --- BOT INITIALIZATION ---
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
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

// --- AI RESPONSE LOGIC (GROQ - UPDATED MODEL) ---
async function getBriaAIResponse(userMessage) {
    try {
        if (!GROQ_API_KEY) {
            console.error("CRITICAL: GROQ_API_KEY is missing!");
            return "Oh Mama, my system key is missing. Please tag @Vihktorrr! ❤️";
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: BRIA_SYSTEM_PROMPT },
                { role: "user", content: userMessage }
            ],
            // UPDATED MODEL HERE:
            model: "llama-3.3-70b-versatile", 
            temperature: 0.7,
            max_tokens: 500,
        });

        return chatCompletion.choices[0]?.message?.content || "I didn't quite catch that, Mama.";

    } catch (error) {
        console.error("--- GROQ AI ERROR ---");
        console.error("Message:", error.message);
        return "I'm so sorry Mama, my brain is a bit tired. Please tag @Vihktorrr for help! ❤️";
    }
}

// --- EMAIL TEMPLATES (FULL VERSION) ---

const getVerifiedEmailStandard = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Program.</p>
<p><b>Step 1: Join your Cohort Telegram Group here: <a href="${tgLink}">${tgLink}</a></b></p>
<p>Please, listen to the Inaugural Session replay pinned in the group once you join.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>Step 2: To complete your registration, please follow these steps:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use Google Chrome browser:</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
`;

const getVerifiedEmail32k = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Program.</p>
<p><b>Step 1: Join your Cohort Telegram Group here: <a href="${tgLink}">${tgLink}</a></b></p>
<p>Please, listen to the Inaugural Session replay pinned in the group once you join.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>Step 2: To complete your registration, please follow these steps:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use Google Chrome browser:</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p><b>Step 3: Access your Pregnancy Safeguarding Resources:</b></p>
<p>KINDLY FILL THE FORM TO HAVE YOUR DETAILS ADDED TO BIRTHSAFE DATABASE.</p>
<p><a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
`;

const getRejectedEmail = (reason) => `
<p>Hello Mama,</p>
<p>We reviewed your payment submission. <span style="color:red;"><b>Unfortunately, it was not verified.</b></span></p>
<p><b>Reason:</b> ${reason}</p>
<p>If you believe this is a mistake, please send an email to: mamacarebirthsafe@gmail.com</p>
<p>Please feel free to upload the right receipt if there is an issue.</p>
<p>Regards,<br>BirthSafe Admin</p>
`;

const BRIA_DM_PACKAGE = `
To new mamas just joining ❤️
Welcome 😊🤗 

You have been added to your cohort, Birth Without Wahala.
Please take note that access to your materials takes about 24hrs - 48hrs (working days) after you fill the Google form.

While you wait for access, kindly do and note the following:
1. Create a Selar account because you will need it to access your materials.
2. Go through the pinned messages (Look up your screen to locate it).
3. Join the 'Online Event Centre' for replays: https://t.me/+FiZMxogFUXAzZGE0
4. Join the 'Consult Session Replays' Group: https://t.me/+cIx-kOJwyVJiMjZk
5. If you have questions, drop it in the group and tag the admin. 
6. PCV Rule: If your PCV is less than 36%, join the PCV Challenge Channel after watching the protocol.
7. Group Consults are every Sunday at 7pm in the Online Event Centre.
8. Injury Timer Group: Eligible at 35/36 weeks.

Thanks for usual cooperation 🥰🥰
`;

const ADMIN_CONTACT_MSG = `
Hello Mama! 🌸
For now, I am here to help you get settled. 
If you have specific questions about the program or medical concerns, please contact our admin directly:

👉 @Vihktorrr
📧 mamacarebirthsafe@gmail.com
`;

// --- API ROUTES ---

app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;
    const { data, error } = await supabase.from('payments').insert([{ full_name: fullName, plan_amount: plan, telegram_number: telegramNumber, country, state_province: state, email, receipt_urls: receiptUrls }]).select().single();
    if (error) throw error;
    const msg = `🚨 <b>New Payment Alert!</b>\n👤 <b>Name:</b> ${fullName}\n💰 <b>Plan:</b> ₦${plan}\n✈️ <b>TG:</b> <code>${telegramNumber}</code>\n<a href="${FRONTEND_URL}?id=${data.id}">Open Admin Dashboard</a>`;
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
        let htmlContent = (amount >= 32000) ? getVerifiedEmail32k(tgLink) : getVerifiedEmailStandard(tgLink);
        
        sendEmail(user.email, 'Welcome to BirthSafe! 🤝', htmlContent);
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ <b>${user.full_name}</b> has been verified!\nOnboarding email sent.`, { parse_mode: 'HTML' });
    } else if (status === 'rejected') {
        // --- REJECTION EMAIL DISPATCH ---
        const rejectionHtml = getRejectedEmail(reason);
        sendEmail(user.email, 'Payment Verification Update ❌', rejectionHtml);
        
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ <b>${user.full_name}</b> REJECTED.\n<b>Reason:</b> ${reason}`, { parse_mode: 'HTML' });
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
            if(!m.is_bot) {
                briaBot.sendMessage(chatId, `Welcome Mama @${m.username || m.first_name} to BirthSafe! 🌸\n\nI am Bria, part of Dr. Idara's team. Please DM me and click START to receive your welcome package!`);
            }
        });
        return;
    }

    if (!text) return;

    if (isPrivate && text.startsWith('/start')) {
        return briaBot.sendMessage(chatId, BRIA_DM_PACKAGE);
    }

    const botMe = await briaBot.getMe();
    const isMentioned = text.includes(`@${botMe.username}`);
    const isReply = msg.reply_to_message && msg.reply_to_message.from.id === botMe.id;

    if (isPrivate || isMentioned || isReply) {
        briaBot.sendChatAction(chatId, 'typing');
        const cleanQuery = text.replace(`@${botMe.username}`, '').trim();
        const aiResponse = await getBriaAIResponse(cleanQuery);
        briaBot.sendMessage(chatId, aiResponse, { parse_mode: 'Markdown', reply_to_message_id: msg.message_id });
    }
});

// --- CRON JOB ---
cron.schedule('0 0 * * *', async () => {
    const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'verified');
    if (count > 0) {
        adminBot.sendMessage(ADMIN_CHAT_ID, `📊 *Daily Report:* Total Verified Users so far: ${count}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BirthSafe Backend running on port ${PORT}`));

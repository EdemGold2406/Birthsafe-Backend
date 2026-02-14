const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
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
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL; 

// --- BOT INITIALIZATION ---
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { 
    polling: { params: { timeout: 10 } } 
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- COHORT LINK HELPER ---
async function getActiveCohortLink() {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('id', 'active_cohort_link')
            .single();
        
        if (error || !data) return "https://t.me/birthsafe_admin";
        return data.value;
    } catch (e) {
        return "https://t.me/birthsafe_admin";
    }
}

// --- EMAIL FUNCTION ---
async function sendEmail(to, subject, htmlBody) {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, htmlBody })
        });
    } catch (error) {
        console.error("Failed to send email:", error);
    }
}

// --- EMAIL TEMPLATES ---
const getVerifiedEmailStandard = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Program.</p>
<p><b>Step 1: Join your Cohort Telegram Group here: <a href="${tgLink}">${tgLink}</a></b></p>
<p>Please, listen to the Inaugural Session replay pinned in the group once you join.</p>
<p>Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>Step 2: Complete your registration:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you.</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
`;

const getVerifiedEmail32k = (tgLink) => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Program.</p>
<p><b>Step 1: Join your Cohort Telegram Group here: <a href="${tgLink}">${tgLink}</a></b></p>
<p>Please, listen to the Inaugural Session replay pinned in the group. Access to your materials/resources will be granted within 24hrs - 48hrs (working days).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>Step 2: Complete your registration:</b></p>
<p>Click the link below to fill out the forms:</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p><b>Bonus Resource Access:</b></p>
<p><a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
`;

const getRejectedEmail = (reason) => `
<p>Hello Mama,</p>
<p>We reviewed your payment submission. <span style="color:red;"><b>Unfortunately, it was not verified.</b></span></p>
<p><b>Reason:</b> ${reason}</p>
<p>If you believe this is a mistake, please send an email to: mamacarebirthsafe@gmail.com</p>
<p>Regards,<br>BirthSafe Admin</p>
`;

const BRIA_WELCOME_PACKAGE = `To new mamas just joining ❤️\n\nWelcome 😊🤗\n\nYou have been added to your cohort.\n\nFull details are in your onboarding email!`;

const ADMIN_CONTACT_MSG = `Hello Mama! 🌸\n\nIf you have specific questions, please contact our admin directly:\n👉 @Vihktorrr\n📧 mamacarebirthsafe@gmail.com`;

// --- API ROUTES ---

app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;

    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName, 
        plan_amount: plan, 
        telegram_number: telegramNumber,
        country, state_province: state, email, 
        receipt_urls: receiptUrls 
      }])
      .select().single();

    if (error) throw error;

    // Switch to HTML parse_mode for stability
    const message = `
🚨 <b>New Payment Alert!</b>
👤 <b>Name:</b> ${fullName}
💰 <b>Plan:</b> ₦${plan}
✈️ <b>Telegram:</b> <code>${telegramNumber}</code>
📸 <b>Receipts:</b> ${receiptUrls.length}

👇 <b>Verify here:</b>
<a href="${FRONTEND_URL}?id=${data.id}">Open Admin Dashboard</a>`;

    await adminBot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'HTML' });
    res.json({ success: true });

  } catch (err) {
    console.error("Submit Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status, reason } = req.body;
    
    const { data: user, error: fetchError } = await supabase.from('payments').select('*').eq('id', id).single();
    if (fetchError || !user) throw new Error("Record not found");
    
    await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);

    if (status === 'verified') {
        const activeTGLink = await getActiveCohortLink();
        const amount = parseInt(user.plan_amount.toString().replace(/,/g, ''));
        
        let htmlContent = amount >= 32000 
            ? getVerifiedEmail32k(activeTGLink) 
            : getVerifiedEmailStandard(activeTGLink);

        sendEmail(user.email, 'Welcome to BirthSafe! 🤝', htmlContent);

        // Switch to HTML parse_mode
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ <b>${user.full_name}</b> has been verified!\nCohort Link sent: ${activeTGLink}`, { parse_mode: 'HTML' });

    } else if (status === 'rejected') {
        sendEmail(user.email, 'Payment Verification Update ❌', getRejectedEmail(reason));
        
        // Switch to HTML parse_mode
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ <b>${user.full_name}</b> has been REJECTED.\n<b>Reason:</b> ${reason}`, { parse_mode: 'HTML' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Verify Route Error:", err);
    res.status(500).json({ error: "Operation failed" });
  }
});

// --- BRIA BOT LOGIC ---
briaBot.on('message', (msg) => {
    if (msg.new_chat_members) {
        msg.new_chat_members.forEach(m => {
            if(!m.is_bot) {
                briaBot.sendMessage(msg.chat.id, `Welcome @${m.username || m.first_name}! I am Bria 🌸\n\nPlease DM me and click START to receive your welcome package!`);
            }
        });
    }
    if (msg.chat.type === 'private' && msg.text && !msg.text.startsWith('/start')) {
        briaBot.sendMessage(msg.chat.id, ADMIN_CONTACT_MSG);
    }
});

briaBot.onText(/\/start/, (msg) => {
    if (msg.chat.type === 'private') {
        briaBot.sendMessage(msg.chat.id, BRIA_WELCOME_PACKAGE);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

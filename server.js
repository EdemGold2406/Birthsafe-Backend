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
/**
 * Fetches the currently active Telegram link from Supabase.
 * Make sure you created the 'app_settings' table!
 */
async function getActiveCohortLink() {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('id', 'active_cohort_link')
            .single();
        
        if (error || !data) return "https://t.me/birthsafe_admin"; // Safety fallback
        return data.value;
    } catch (e) {
        return "https://t.me/birthsafe_admin";
    }
}

// --- EMAIL FUNCTION (Via Google Script) ---
async function sendEmail(to, subject, htmlBody) {
    if (!GOOGLE_SCRIPT_URL) return console.error("Missing GOOGLE_SCRIPT_URL");
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: to, subject: subject, htmlBody: htmlBody })
        });
        return await response.json();
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
<p>Please, listen to the Inaugural Session replay pinned in the group. Access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>Step 2: Complete your registration:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you.</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p><b>Bonus Resource Access:</b></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
<p><a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
`;

const getRejectedEmail = (reason) => `
<p>Hello Mama,</p>
<p>We reviewed your payment submission. <span style="color:red;"><b>Unfortunately, it was not verified.</b></span></p>
<p><b>Reason:</b> ${reason}</p>
<p>If you believe this is a mistake, please send an email to: mamacarebirthsafe@gmail.com</p>
<p>Please feel free to upload the right receipt via the portal if there was an issue.</p>
<p>Regards,<br>BirthSafe Admin</p>
`;

const BRIA_WELCOME_PACKAGE = `
To new mamas just joining ❤️

Welcome 😊🤗 

You have been added to your cohort.

Please take note that access to your materials takes about 24hrs -48hrs (working days)after you fill the Google form.

Now that you have been added to the group, the messages on the group might seem overwhelming and confusing. But calm down, mama.❤️ 

Your priority should be getting your materials and implementing what you've learnt.

While you wait for access, kindly do and note the following:
1. Create a Selar account because you will need it to access your materials.
2. Go through the pinned messages.
3. Join 'Online Event Centre': https://t.me/+FiZMxogFUXAzZGE0
4. Join 'Consult Session Replays': https://t.me/+cIx-kOJwyVJiMjZk

Full details are provided in your onboarding email!
`;

const ADMIN_CONTACT_MSG = `
Hello Mama! 🌸
For now, I am here to help you get settled. 
If you have specific questions about the program or medical concerns, please contact our admin directly:

👉 @Vihktorrr
📧 mamacarebirthsafe@gmail.com
`;

// --- API ROUTES ---

// 1. Submit Payment Route
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;

    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName, 
        plan_amount: plan, 
        telegram_number: telegramNumber,
        country, 
        state_province: state, 
        email, 
        receipt_urls: receiptUrls 
      }])
      .select()
      .single();

    if (error) throw error;

    const message = `
🚨 *New Payment Alert!*
👤 *Name:* ${fullName}
💰 *Plan:* ₦${plan}
✈️ *Telegram:* \`${telegramNumber}\`
📸 *Receipts:* ${receiptUrls.length}

👇 *Verify here:*
[Open Admin Dashboard](${FRONTEND_URL}?id=${data.id})`;

    await adminBot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    res.json({ success: true });

  } catch (err) {
    console.error("Submit Route Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Verify/Reject Payment Route
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status, reason } = req.body;
    
    // Fetch User
    const { data: user, error: fetchError } = await supabase.from('payments').select('*').eq('id', id).single();
    if (fetchError || !user) throw new Error("Record not found");
    
    // Update DB Status
    await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);

    if (status === 'verified') {
        // FETCH DYNAMIC COHORT LINK FROM DB
        const activeTGLink = await getActiveCohortLink();

        const amountStr = user.plan_amount.toString().replace(/,/g, '');
        const amount = parseInt(amountStr);
        
        let htmlContent = amount >= 32000 
            ? getVerifiedEmail32k(activeTGLink) 
            : getVerifiedEmailStandard(activeTGLink);

        sendEmail(user.email, 'Welcome to BirthSafe! 🤝', htmlContent);

        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ *${user.full_name}* verified!\nCohort Link sent: ${activeTGLink}`, { parse_mode: 'Markdown' });

    } else if (status === 'rejected') {
        sendEmail(user.email, 'Payment Verification Update ❌', getRejectedEmail(reason));
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ *${user.full_name}* REJECTED.\nReason: ${reason}`, { parse_mode: 'Markdown' });
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
                const welcomeShort = `Welcome @${m.username || m.first_name}! My name is Bria 🌸\n\nPlease DM me and click START to receive your welcome package!`;
                briaBot.sendMessage(msg.chat.id, welcomeShort);
            }
        });
    }

    if (msg.chat.type === 'private' && msg.text && !msg.text.startsWith('/start')) {
        briaBot.sendMessage(msg.chat.id, ADMIN_CONTACT_MSG);
    }
});

briaBot.onText(/\/start/, (msg) => {
    if (msg.chat.type === 'private') {
        briaBot.sendMessage(msg.chat.id, BRIA_WELCOME_PACKAGE, { disable_web_page_preview: true });
    }
});

// --- CRON JOB ---
cron.schedule('0 0 * * *', async () => {
    const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'verified');
    if (count > 0) {
        adminBot.sendMessage(ADMIN_CHAT_ID, `📊 *Daily Report:* Total Verified Users so far: ${count}`);
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

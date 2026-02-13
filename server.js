const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const cron = require('node- immediately while the email sends in the background.
3. **Full Messages**: All onboarding and welcome package text is included in full.
4. **Error Handling**: Added logs to help you see exactly what happens in Render.

### Final `server.js` (Complete Code)

```javascript
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot =cron');
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

// --- BOT INITIALIZATION ---
// Admin Bot: For payment notifications
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });

// Bria Bot: For community interaction
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { 
    polling: {
        params: { timeout:  require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- HEALTH CHECK ---
app.get('/', (req, res) => res.send('BirthSafe Backend is Active! 🚀'));

// --- CONFIGURATION ---
const SUPABASE_URL10 }
    } 
});

// --- EMAIL CONFIG ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- EMAIL TEMPLATES ---

const getVerifiedEmailStandard = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
< = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// --- BOT INITIALIZATION ---
// Admin Bot: Specifically for the Admin Group alerts
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });

// Bria Bot: For the Mamas' group and community support
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { 
    polling: {
        paramsp>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p: { timeout: 10 }
    } 
});

// --- EMAIL CONFIG ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p>To complete your registration, please follow these steps:</p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use.EMAIL_USER,
    pass: process.env.EMAIL_PASS // The 16-character App Password
  }
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- MESSAGE TEMPLATES ---

const getVerifiedEmailStandard = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send Google Chrome browser</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
`;

const getVerifiedEmail32k = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural an email to mamacarebirthsafe@gmail.com</p>
<p><b>To complete your registration, please follow these steps:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use Google Chrome browser</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your Session replay pinned in the group.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
 cooperation. We look forward to supporting you on this journey!</p>
`;

const getVerifiedEmail32k = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group.</p>
<p>You<p>To complete your registration, please follow these steps:</p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use Google Chrome browser</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8"> can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>To complete your registration, please follow these steps:https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>
<p><a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
`;

const getRejectedEmail = (reason</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you. If the link doesn’t open, try checking your network or use Google Chrome browser</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward) => `
<p>Hello Mama,</p>
<p>We reviewed your payment submission for the Birth Without Wahala Program.</p>
<p style="color:red;"><b>Unfortunately, it was not verified.</b></p>
<p><b>Reason:</b> ${reason}</p>
<p>If you believe this is a mistake, please call: 08123456789</p>
 to supporting you on this journey!</p>
<p><a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
`;

const getRejectedEmail = (reason) => `
<p>Hello Mama,</p>
<p>We reviewed your payment submission for the Birth Without Wahala Program.</p>
<p style<p>Regards,<br>BirthSafe Admin</p>
`;

const BRIA_WELCOME_PACKAGE = `
To new mamas just joining ❤️

Welcome 😊🤗 

You have been added to your cohort.

Please take note that access to your materials takes about 24hrs -48hrs (working days)after you fill the Google form.

Now that you have been added to the group, the messages on the group might seem overwhelming and confusing.

But calm down, mama.❤️ 

Your priority should be getting your materials and implementing what you've learnt.

The chats in the group are from mamas who have already accessed their resources and need further clarification on="color:red;"><b>Unfortunately, it was not verified.</b></p>
<p><b>Reason:</b> ${reason}</p>
<p>If you believe this is a mistake, please call: 08123456789</p>
<p>Regards,<br>BirthSafe Admin</p>
`;

const BRIA_WELCOME_PACKAGE = `
To new mamas just joining ❤️

Welcome 😊🤗 

You have been added to your cohort.

Please take note that access to your materials takes about 24hrs - 48hrs (working days) after you fill the Google form.

Now that you have been added to the them.

While you wait for access, kindly do and note the following:

1. Create a Selar account because you will need it to access your materials.

2. Go through the pinned messages ( Look up your screen to locate it. Keep tapping to see other messages that are pinned)

3. Join the 'Online Event Centre' and watch all the Replays pinned on the group. Here is the link👇
https://t.me/+FiZM group, the messages on the group might seem overwhelming and confusing.

But calm down, mama.❤️ 

Your priority should be getting your materials and implementing what you've learnt.

The chats in the group are from mamas who have already accessed their resources and need further clarification on them.

While you wait for access, kindly do and note the following:

1. Create a Selar account because you will need it to access your materials.
2.xogFUXAzZGE0

4. We also have more Replays in the 'Consult Session Replays' Group. Here is the link below 👇 
https://t.me/+cIx-kOJwyVJiMjZk

5. If you have questions, kindly drop it in the group. Tag the admin to it and be patient. Go through the pinned messages (Look up your screen to locate it. Keep tapping to see other messages that are pinned)
3. Join the 'Online Event Centre' and watch all the Replays pinned on the group. Here is the link👇
https://t.me/+FiZMxogFUXAzZGE0

4. We also have more Replays in the 'Consult Session Replays' Group. Here is the link below 👇 
https:// Admins will attend to it as soon as they see it. Please, ask repeatedly in case you don't get a response the first time.

Alternatively, send your questions to mamacarebirthsafe@gmail.com 

This is our official communication channel.

For urgent cases, please go the hospital.

6. If your PCV is less than 36%, we advise that after watching your PCV and Supplements Protocol, join the PCV Challenge Channel. (To be able to do this, fill the form in the pinned messages and wait for a reply within t.me/+cIx-kOJwyVJiMjZk

5. If you have questions, kindly drop it in the group. Tag the admin to it and be patient. Admins will attend to it as soon as they see it. Please, ask repeatedly in case you don't get a response the first time.

Alternatively, send your questions to mamacarebirthsafe@gmail.com 

This is our official communication channel.
For48hrs - 72hrs)

7. Kindly note that the 'Online Event Centre' is where we usually have our Group Consult Session every Sunday ( for the duration of the program) and Morning Check-in.

Ensure you drop your question before the Group Consult Session with Doctor by 7pm. The channel to drop your questions will be opened and provided to you Sunday morning.

Please, be present during the consult session so that you can answer follow-up questions from the doctor.

8. When you get to 35/36 weeks, you are eligible to join the Injury Timer Group where you will NIL as a group every Sunday.(Please note that you still have to continue your individual urgent cases, please go the hospital.

6. If your PCV is less than 36%, we advise that after watching your PCV and Supplements Protocol, join the PCV Challenge Channel. (To be able to do this, fill the form in the pinned messages and wait for a reply within 48hrs - 72hrs)

7. Kindly note that the 'Online Event Centre' is where we usually have our Group Consult Session every Sunday (for the duration of the program) and Morning Check-in.

Ensure you drop your question before the Group Consult Session with Doctor by NIL)

9. You will be added to the Premium/Postpartum Group when the Regular program ends. We will announce in the group at the appropriate time.

10. Please, make use of the pinned messages. It contains vital information and helpful tips that can help you in your Pregnancy.


Thanks for usual cooperation 🥰🥰
`;

const ADMIN_CONTACT_MSG = `
Hello Mama! 🌸

For now, I am here to help you get settled. 
If you have specific questions about the program or medical concerns, please contact our admin directly:

👉 7pm. The channel to drop your questions will be opened and provided to you Sunday morning.

Please, be present during the consult session so that you can answer follow-up questions from the doctor.

8. When you get to 35/36 weeks, you are eligible to join the Injury Timer Group where you will NIL as a group every Sunday.

9. You will be added to the Premium/Postpartum Group when the Regular program ends. We will announce in the group at the appropriate time.

10. Please, make use of the pinned messages. It contains vital information and helpful tips that can help you in your Pregnancy.

Thanks for usual cooperation 🥰🥰
`;

const ADMIN_CONTACT_MSG = `
Hello Mama! 🌸

For now, I am here to help you @Vihktorrr
📧 mamacarebirthsafe@gmail.com

They will provide the clarity you need! ❤️
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
        telegram_number: telegramNumber,
        country, 
        state_province: state, 
        email, 
        receipt_urls: receiptUrls 
      }])
      .select get settled. 
If you have specific questions about the program or medical concerns, please contact our admin directly:

👉 @Vihktorrr
📧 mamacarebirthsafe@gmail.com

They will provide the clarity you need! ❤️
`;

// --- API ROUTES ---

// 1. Submit Payment Route
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, telegramNumber, country, state, email, receiptUrls } = req.body;

    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName,()
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
💰 *Plan:*    await adminBot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status, reason } = req.body;
    
    // Fetch User
    const { data: user, error: fetchError } = await supabase.from('payments').select('*').eq('id', id). ₦${plan}
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
    const {single();
    if (fetchError || !user) throw new Error("Payment record not found");
    
    // Update DB
    await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);

    if (status === 'verified') {
        const amount = parseInt(user.plan_amount.toString().replace(/,/g, ''));
        let html = amount >= 320 id, status, reason } = req.body;
    
    // Fetch User
    const { data: user, error: fetchError } = await supabase.from('payments').select('*').eq('id', id).single();
    if (fetchError || !user) throw new Error("Record not found");
    
    // Update DB
    00 ? getVerifiedEmail32k() : getVerifiedEmailStandard();

        // Send Email (Background)
        transporter.sendMail({
            from: `"BirthSafe NG" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Welcome to BirthSafe! 🤝',
            const { error: updateError } = await supabase.from('payments').update({ status, rejection_reason: reason || null }).eq('id', id);
    if (updateError) throw updateError;

    if (status === 'verified') {
        // Logic for package selection
        const amountStr = user.plan_amount.toString().replace(/,/g, '');
        const amount = parseInt(amountStr);
        let htmlContent = amount >= html: html
        }).catch(e => console.error("Email Error:", e));

        // Send Telegram Msg (Await this)
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ *${user.full_name}* has been verified!\nOnboarding email sent.`, { parse_mode: 'Markdown' });
        
    } else {
        // Send Rejection Email (Background)
        transporter.sendMail({
            from32000 ? getVerifiedEmail32k() : getVerifiedEmailStandard();

        // Send Email (Async)
        transporter.sendMail({
            from: `"BirthSafe NG" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Welcome to BirthSafe! 🤝',
            html: htmlContent
        }).catch(e => console.error("Nodemailer Error:",: `"BirthSafe NG" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Payment Verification Failed ❌',
            html: getRejectedEmail(reason)
        }).catch(e => console.error("Email Error:", e));

        // Send Telegram Msg (Await this)
        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ *${user.full_name} e));

        // Telegram Confirmation (Awaited)
        await adminBot.sendMessage(ADMIN_CHAT_ID, `✅ *${user.full_name}* has been verified!\nOnboarding email sent.`, { parse_mode: 'Markdown' });

    } else if (status === 'rejected') {
        transporter.sendMail({
            from: `"BirthSafe NG" <${process.env.EMAIL_USER}>`,
            to* has been REJECTED.\nReason: ${reason}`, { parse_mode: 'Markdown' });
    }
    
    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// --- BRIA BOT LOGIC ---

briaBot.on('message', (msg) => {
    // Welcome logic
    if (msg.new_chat_members) {
        msg.new_chat_members.forEach(m => {
            if(!m.is_bot) briaBot.sendMessage(msg.chat.id, `Welcome @${m.username || m.first_name}! My name is Bria 🌸. DM me /start for your package!`);
        });
    }
    // Question logic (Private: user.email,
            subject: 'Payment Verification Update ❌',
            html: getRejectedEmail(reason)
        }).catch(e => console.error("Nodemailer Error:", e));

        await adminBot.sendMessage(ADMIN_CHAT_ID, `❌ *${user.full_name}* has been REJECTED.\nReason: ${reason}`, { parse_mode: 'Markdown' });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Verify Route Error:", err);
    res.status(500).json({ error: "Operation failed" });
  }
});

// --- BRIA BOT LOGIC ---

briaBot.on('message', (msg) => {
    // 1. Group Welcome
    if (msg.new_chat_members) {
         DM)
    if (msg.chat.type === 'private' && msg.text && !msg.text.startsWith('/start')) {
        briaBot.sendMessage(msg.chat.id, ADMIN_CONTACT_MSG);
    }
});

briaBot.onText(/\/start/, (msg) => {
    if (msg.chat.type === 'private') {
        briaBot.sendMessage(msg.chat.idmsg.new_chat_members.forEach(m => {
            if(!m.is_bot) {
                const welcomeShort = `Welcome @${m.username || m.first_name}! My name is Bria 🌸\n\nPlease DM me and click START to receive your welcome package!`;
                briaBot.sendMessage(, BRIA_WELCOME_PACKAGE);
    }
});

// --- CRON JOB (DAILY REPORT) ---
cron.schedule('0 0 * * *', async () => {
    const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'verified');
    if (count > 0) {
        adminBot.sendMessage(ADMIN_CHAT_IDmsg.chat.id, welcomeShort);
            }
        });
    }

    // 2. Private DM Help Message
    if (msg.chat.type === 'private' && msg.text && !msg.text.startsWith('/start')) {
        briaBot.sendMessage(msg.chat.id, ADMIN_CONTACT_MSG);
    }
});

// 3. /start command in DM
briaBot.onText(/\/, `📊 *Daily Report:* Total Verified Users so far: ${count}`);
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(start/, (msg) => {
    if (msg.chat.type === 'private') {
        briaBot.sendMessage(msg.chat.id, BRIA_WELCOME_PACKAGE, { disable_web_page_preview: true });
    }
});

// --- CRON JOB (DAILY STATS) ---
cron.schedule('0 PORT, () => console.log(`Backend running on port ${PORT}`));

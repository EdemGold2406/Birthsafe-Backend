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

// --- BOT INITIALIZATION (ONLY ONCE) ---
// Admin Bot handles payment alerts
const adminBot = new TelegramBot(process.env.ADMIN_BOT_TOKEN, { polling: false });

// Bria Bot handles community chat
const briaBot = new TelegramBot(process.env.BRIA_BOT_TOKEN, { 
    polling: {
        params: { timeout: 10 }
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

// --- TEMPLATES ---
const getVerifiedEmail20k = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group.</p>
<p>You can also find the program schedule in the pinned messages in the group. Kindly note that access to your materials/resources will be granted to you within 24hrs - 48hrs (working days) after filling the form(s).</p>
<p>If you have any questions/concerns, kindly send an email to mamacarebirthsafe@gmail.com</p>
<p><b>To complete your registration, please follow these steps:</b></p>
<p>Click the link below to fill out the forms. Ensure you enter a valid and functional email address, as this will be used to send resources to you.</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>`;

const getVerifiedEmail32k = () => `
<p>Welcome, Mama, to Birthsafe School of Pregnancy! 🤝</p>
<p>You have successfully enrolled in the Birth Without Wahala Cohort 14 Program.</p>
<p>Please, listen to the Inaugural Session replay pinned in the group. Access to materials granted in 24-48hrs.</p>
<p>To complete your registration, please follow these steps:</p>
<p><a href="https://forms.gle/gspjv2jxy1kUsvRM8">https://forms.gle/gspjv2jxy1kUsvRM8</a></p>
<p>Access your bonus resources here: <a href="https://birthsafeng.myflodesk.com/bwwps">https://birthsafeng.myflodesk.com/bwwps</a></p>
<p>Thank you for your cooperation. We look forward to supporting you on this journey!</p>`;

const getRejectedEmail = (reason) => `
<p>Hello Mama,</p>
<p>We reviewed your payment submission for the Birth Without Wahala Program.</p>
<p style="color:red;"><b>Unfortunately, it was not verified.</b></p>
<p><b>Reason:</b> ${reason}</p>
<p>If you believe this is a mistake, please call: 08123456789</p>
<p>Regards,<br>BirthSafe Admin</p>`;

const BRIA_PACKAGE = `
To new mamas just joining ❤️
Welcome 😊🤗 
You have been added to your cohort.
Your priority should be getting your materials and implementing what you've learnt.

1. Create a Selar account.
2. Go through pinned messages.
3. Join 'Online Event Centre': https://t.me/+FiZMxogFUXAzZGE0
4. Join 'Consult Session Replays': https://t.me/+cIx-kOJwyVJiMjZk

Full details are provided in your onboarding email!
`;

// --- API ROUTES ---

// Submit Payment
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

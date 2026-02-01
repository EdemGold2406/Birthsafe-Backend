// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors()); // Allows your frontend to talk to this server

// --- HARDCODED CONFIG (Since it's a Rush Job) ---
// In a perfect world, these go in .env, but this ensures it works NOW.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qgrluobqmyzpaeblonbx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_nO2pexNfAlx0Xv-0BaMXVw_OVRdA28J';
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8593585559:AAEWBOZcGehTSnBXG3RYn-n5ocxxsi2hzwA';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '-5177164718'; 

// IMPORTANT: Update this line once you deploy the Frontend!
// Example: const FRONTEND_URL = 'https://birthsafe.onrender.com';
const FRONTEND_URL = process.env.FRONTEND_URL; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// --- ROUTE 1: Handle New Payment ---
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, whatsapp, telegram, receiptUrl } = req.body;

    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName, 
        plan_amount: plan, 
        whatsapp_number: whatsapp, 
        telegram_number: telegram,
        receipt_url: receiptUrl 
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Send Message to Telegram Group
    const verifyLink = `${FRONTEND_URL}?id=${data.id}`;
    
    const message = `
🚨 *New Payment Alert!*

👤 *Name:* ${fullName}
💰 *Plan:* ${plan}
📱 *WhatsApp:* \`${whatsapp}\`

👇 *Click below to verify:*
[Open Admin Dashboard](${verifyLink})
    `;

    await bot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });

    console.log(`Success: Notification sent for ${fullName}`);
    res.json({ success: true });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTE 2: Verify/Reject Payment ---
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { id, status } = req.body;
    
    // 1. Update Supabase
    await supabase
      .from('payments')
      .update({ status: status })
      .eq('id', id);

    // 2. Notify Group of the change
    const icon = status === 'verified' ? '✅' : '❌';
    await bot.sendMessage(ADMIN_CHAT_ID, `Payment for ID ...${id.slice(-4)} has been marked as *${status.toUpperCase()}* ${icon}`, { parse_mode: 'Markdown' });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

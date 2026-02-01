const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors()); // Critical: Allows frontend to talk to backend

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// Route 1: Receive Payment Data
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, whatsapp, receiptUrl } = req.body;

    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('payments')
      .insert([{ 
        full_name: fullName, 
        plan_amount: plan, 
        whatsapp_number: whatsapp, 
        receipt_url: receiptUrl 
      }])
      .select()
      .single();

    if (error) throw error;

    // 2. Notify Telegram Group
    const verifyLink = `${FRONTEND_URL}?id=${data.id}`;
    const message = `
🚨 *New Payment Alert!*
👤 ${fullName}
💰 ${plan}
📱 ${whatsapp}

👇 *Verify here:*
[Open Dashboard](${verifyLink})
    `;

    await bot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    res.json({ success: true });

  } catch (err) {
    console.error("Backend Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Route 2: Update Status
app.post('/api/verify-payment', async (req, res) => {
  const { id, status } = req.body;
  await supabase.from('payments').update({ status: status }).eq('id', id);
  
  const icon = status === 'verified' ? '✅' : '❌';
  await bot.sendMessage(ADMIN_CHAT_ID, `Payment for ID ...${id.slice(-4)} marked as ${status.toUpperCase()} ${icon}`);
  
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend live on port ${PORT}`));

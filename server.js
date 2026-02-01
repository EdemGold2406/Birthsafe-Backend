// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
app.use(express.json());
// Allow all origins for the rush job so we don't get blocked
app.use(cors());

// --- CONFIGURATION ---
// These will be set in Render Dashboard
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
const FRONTEND_URL = process.env.FRONTEND_URL; // We will add this later on Render

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// --- ROUTES ---

// 1. Submit Payment
app.post('/api/submit-payment', async (req, res) => {
  try {
    const { fullName, plan, whatsapp, telegram, receiptUrl } = req.body;

    // Save to DB
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

    // Send Telegram Msg
    const verifyLink = `${FRONTEND_URL}/admin/verify/${data.id}`;
    const message = `
👶 *New Payment!*
👤 ${fullName}
💰 ${plan}
📱 ${whatsapp}

👇 *Action:*
[Verify Payment Now](${verifyLink})
    `;

    await bot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Verify Payment
app.post('/api/verify-payment', async (req, res) => {
  const { id, status } = req.body;
  
  await supabase
    .from('payments')
    .update({ status: status })
    .eq('id', id);

  const icon = status === 'verified' ? '✅' : '❌';
  await bot.sendMessage(ADMIN_CHAT_ID, `Payment for ID ...${id.slice(-4)} marked as ${status.toUpperCase()} ${icon}`);
  
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

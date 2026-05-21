const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ytdlp = require('yt-dlp-exec').create();

const TOKEN = '8711239939:AAGxPIDdDTiA_D1oNgF7oALgcEnNf05EawA';

const bot = new TelegramBot(TOKEN, {
  polling: true
});

console.log('Bot encendido ✅');

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '📥 Envíame un link de TikTok, Instagram o Facebook'
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  try {

    // ===== TIKTOK =====
    if (text.includes('tiktok.com')) {

      await bot.sendMessage(
        chatId,
        '⏳ Descargando TikTok...'
      );

      const response = await axios.get(
        `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`
      );

      const data = response.data.data;

      // Si es carrusel/fotos
      if (
        data.images &&
        Array.isArray(data.images) &&
        data.images.length > 0
      ) {

        for (const image of data.images) {
          await bot.sendPhoto(chatId, image);
        }

        return bot.sendMessage(
          chatId,
          '✅ Fotos descargadas'
        );
      }

      // Si es video
      if (data.play) {
        return bot.sendVideo(
          chatId,
          data.play,
          {
            caption: '✅ Video descargado'
          }
        );
      }

      return bot.sendMessage(
        chatId,
        '❌ No pude descargar ese TikTok.'
      );
    }

    // ===== INSTAGRAM =====
if (text.includes('instagram.com')) {

  await bot.sendMessage(
    chatId,
    '⏳ Descargando Instagram...'
  );

  try {

    const api = await axios.get(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`
    );

    const data = api.data.data;

    if (data.play) {
      return bot.sendVideo(chatId, data.play, {
        caption: '✅ Video descargado'
      });
    }

  } catch (e) {
    console.log(e);
  }

  return bot.sendMessage(
    chatId,
    '❌ No pude descargar ese Instagram.'
  );
}

// ===== FACEBOOK =====
if (
  text.includes('facebook.com') ||
  text.includes('fb.watch')
) {

  await bot.sendMessage(
    chatId,
    '⏳ Descargando Facebook...'
  );

  try {

    const api = await axios.get(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`
    );

    const data = api.data.data;

    if (data.play) {
      return bot.sendVideo(chatId, data.play, {
        caption: '✅ Video descargado'
      });
    }

  } catch (e) {
    console.log(e);
  }

  return bot.sendMessage(
    chatId,
    '❌ No pude descargar ese Facebook.'
  );
}
    }

    bot.sendMessage(
      chatId,
      '❌ Link no válido'
    );

  } catch (error) {
    console.log(error);

    bot.sendMessage(
      chatId,
      '❌ Error al descargar'
    );
  }
});
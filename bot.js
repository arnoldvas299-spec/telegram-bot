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

    // ===== INSTAGRAM / FACEBOOK =====
    if (
      text.includes('instagram.com') ||
      text.includes('facebook.com') ||
      text.includes('fb.watch')
    ) {

      const carpeta = path.join(
        __dirname,
        `descarga_${Date.now()}`
      );

      fs.mkdirSync(carpeta, {
        recursive: true
      });

      await bot.sendMessage(
        chatId,
        '⏳ Descargando...'
      );

      await ytdlp(text, {
        output: path.join(
          carpeta,
          '%(title)s.%(ext)s'
        ),
        format: 'bestvideo+bestaudio/best'
      });

      const archivos = fs.readdirSync(carpeta);

      for (const archivo of archivos) {

        const ruta = path.join(
          carpeta,
          archivo
        );

        const ext = path
          .extname(archivo)
          .toLowerCase();

        // Fotos
        if (
          ['.jpg', '.jpeg', '.png', '.webp']
            .includes(ext)
        ) {
          await bot.sendPhoto(chatId, ruta);
        }

        // Videos
        if (
          ['.mp4', '.mov', '.mkv']
            .includes(ext)
        ) {
          await bot.sendVideo(chatId, ruta);
        }
      }

      fs.rmSync(carpeta, {
        recursive: true,
        force: true
      });

      return;
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
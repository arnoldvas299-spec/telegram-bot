const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TOKEN = '8711239939:AAGxPIDdDTiA_D1oNgF7oALgcEnNf05EawA';

const bot = new TelegramBot(TOKEN, {
  polling: true
});

console.log('Bot encendido ✅');

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📥 Envíame un link de:

✅ TikTok (videos y fotos)
✅ Instagram (videos y fotos)`
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

      // Fotos TikTok
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

      // Video TikTok
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

      const response = await axios.get(
        `https://api.vreden.my.id/api/igdl?url=${encodeURIComponent(text)}`
      );

      const data = response.data;

      if (!data.result || !data.result.length) {
        return bot.sendMessage(
          chatId,
          '❌ No pude descargar ese Instagram.'
        );
      }

      for (const media of data.result) {

        if (media.url.includes('.mp4')) {

          await bot.sendVideo(
            chatId,
            media.url,
            {
              caption: '✅ Video descargado'
            }
          );

        } else {

          await bot.sendPhoto(
            chatId,
            media.url
          );
        }
      }

      return;
    }

    return bot.sendMessage(
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
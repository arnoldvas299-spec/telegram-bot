const TelegramBot  = require('node-telegram-bot-api');
const axios        = require('axios');
const youtubedl    = require('youtube-dl-exec');
const path         = require('path');
const fs           = require('fs');
const os           = require('os');

const TOKEN        = process.env.TOKEN || '8711239939:AAGxPIDdDTiA_D1oNgF7oALgcEnNf05EawA';
const COOKIES_PATH = path.join(__dirname, 'cookies.txt');
const bot          = new TelegramBot(TOKEN, { polling: true });

console.log('Bot encendido');
console.log(fs.existsSync(COOKIES_PATH)
  ? 'cookies.txt encontrado - historias de Instagram habilitadas'
  : 'AVISO: cookies.txt no encontrado - las historias de Instagram no funcionaran'
);

// ─── Utilidades ──────────────────────────────────────────────────────────────

function detectPlatform(url) {
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com/stories/'))                       return 'instagram_story';
  if (url.includes('instagram.com') || url.includes('instagr.am'))  return 'instagram';
  if (url.includes('facebook.com') || url.includes('fb.watch') ||
      url.includes('fb.com'))                                        return 'facebook';
  return null;
}

function tempFilePath() {
  return path.join(os.tmpdir(), `tgbot_${Date.now()}`);
}

function cleanUp(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

function fileSizeMB(filePath) {
  return fs.statSync(filePath).size / (1024 * 1024);
}

function progressBar(percent) {
  const filled = Math.round(percent / 10);
  return 'X'.repeat(filled).replace(/X/g, '\u2588') + '\u2591'.repeat(10 - filled) + ` ${percent}%`;
}

// ─── Menu principal ───────────────────────────────────────────────────────────

const MENU_KEYBOARD = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: '\uD83C\uDFB5 TikTok',    callback_data: 'info_tiktok'    },
        { text: '\uD83D\uDCF8 Instagram', callback_data: 'info_instagram' },
        { text: '\uD83D\uDCD8 Facebook',  callback_data: 'info_facebook'  },
      ],
      [
        { text: '\u2753 Ayuda',                      callback_data: 'ayuda'    },
        { text: '\uD83D\uDCCA Que puedo descargar?', callback_data: 'formatos' },
      ],
    ],
  },
  parse_mode: 'Markdown',
};

// ─── Comando /start ───────────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const nombre = msg.from?.first_name || 'amigo';
  bot.sendMessage(
    msg.chat.id,
    `\u256C\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n` +
    `\u2551  \uD83D\uDCE5  *DESCARGADOR PRO*  \u2551\n` +
    `\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n\n` +
    `\uD83D\uDC4B Hola, *${nombre}*!\n\n` +
    `Enviame un link y te descargo el contenido al instante.\n\n` +
    `*Plataformas disponibles:*\n` +
    `\uD83C\uDFB5 TikTok  \u2022  \uD83D\uDCF8 Instagram  \u2022  \uD83D\uDCD8 Facebook\n` +
    `\uD83D\uDCF8 Historias de Instagram (con cookies)\n\n` +
    `_Solo pega el link y listo_ \u2728`,
    { ...MENU_KEYBOARD }
  );
});

// ─── Comando /ayuda ───────────────────────────────────────────────────────────

bot.onText(/\/ayuda/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `\uD83D\uDCD6 *GUIA DE USO*\n\n` +
    `1\uFE0F\u20E3 Copia el link del video\n` +
    `2\uFE0F\u20E3 Pegalo aqui en el chat\n` +
    `3\uFE0F\u20E3 Espera unos segundos\n` +
    `4\uFE0F\u20E3 Recibe tu video! \uD83C\uDF89\n\n` +
    `*Limitaciones:*\n` +
    `\u2022 Cuentas privadas \u274C\n` +
    `\u2022 Videos eliminados \u274C\n` +
    `\u2022 Historias: necesitan cookies \uD83C\uDF6A\n` +
    `\u2022 Maximo 50 MB por video \u26A0\uFE0F`,
    { parse_mode: 'Markdown' }
  );
});

// ─── Callbacks de botones inline ─────────────────────────────────────────────

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data   = query.data;

  await bot.answerCallbackQuery(query.id);

  const respuestas = {
    info_tiktok:
      `\uD83C\uDFB5 *TikTok*\n\n` +
      `\u2705 Videos normales\n` +
      `\u2705 Albums de fotos\n` +
      `\u2705 Sin marca de agua\n\n` +
      `_Pega el link del TikTok en el chat_`,
    info_instagram:
      `\uD83D\uDCF8 *Instagram*\n\n` +
      `\u2705 Reels\n` +
      `\u2705 Posts con video\n` +
      `\u2705 Carruseles\n` +
      `\uD83C\uDF6A Historias (requiere cookies.txt)\n\n` +
      `_Pega el link en el chat_`,
    info_facebook:
      `\uD83D\uDCD8 *Facebook*\n\n` +
      `\u2705 Videos publicos\n` +
      `\u2705 Reels de Facebook\n` +
      `\u274C Videos privados\n\n` +
      `_Pega el link en el chat_`,
    ayuda:
      `\u2753 *AYUDA RAPIDA*\n\n` +
      `Solo pega el link directamente en el chat.\n\n` +
      `Si algo falla:\n` +
      `\u2022 El video es publico? \uD83D\uDD13\n` +
      `\u2022 El link esta completo? \uD83D\uDD17\n` +
      `\u2022 El video existe aun? \uD83D\uDCF9`,
    formatos:
      `\uD83D\uDCCA *FORMATOS SOPORTADOS*\n\n` +
      `\uD83C\uDFB5 *TikTok*\n` +
      `   \u2022 MP4 sin marca de agua\n` +
      `   \u2022 Albums de fotos (JPG)\n\n` +
      `\uD83D\uDCF8 *Instagram*\n` +
      `   \u2022 MP4 (Reels y videos)\n` +
      `   \uD83C\uDF6A Historias (con cookies.txt)\n\n` +
      `\uD83D\uDCD8 *Facebook*\n` +
      `   \u2022 MP4 (videos publicos)\n\n` +
      `_Peso maximo: 50 MB_`,
  };

  if (respuestas[data]) {
    bot.sendMessage(chatId, respuestas[data], { parse_mode: 'Markdown' });
  }
});

// ─── Downloader: TikTok ───────────────────────────────────────────────────────

async function downloadTikTok(chatId, url) {
  const msgEspera = await bot.sendMessage(
    chatId,
    `\uD83D\uDD0D *Analizando TikTok...*\n\n\`${progressBar(10)}\``,
    { parse_mode: 'Markdown' }
  );

  const res  = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
  const data = res.data?.data;

  if (!data) throw new Error('tikwm no devolvio datos');

  await bot.editMessageText(
    `\u2B07\uFE0F *Descargando TikTok...*\n\n\`${progressBar(60)}\``,
    { chat_id: chatId, message_id: msgEspera.message_id, parse_mode: 'Markdown' }
  );

  // Album de fotos
  if (data.images?.length > 0) {
    await bot.deleteMessage(chatId, msgEspera.message_id);
    for (const img of data.images) await bot.sendPhoto(chatId, img);
    return bot.sendMessage(
      chatId,
      `\u2705 *Listo!* Se descargaron *${data.images.length} fotos* de TikTok \uD83C\uDF89\n\n_Quieres descargar otro?_ \uD83D\uDC47`,
      { ...MENU_KEYBOARD }
    );
  }

  // Video
  if (data.play) {
    await bot.editMessageText(
      `\uD83D\uDCE4 *Enviando video...*\n\n\`${progressBar(90)}\``,
      { chat_id: chatId, message_id: msgEspera.message_id, parse_mode: 'Markdown' }
    );

    await bot.sendVideo(chatId, data.play, {
      caption:
        `\uD83C\uDFB5 *TikTok descargado* \u2705\n` +
        (data.author?.nickname ? `\uD83D\uDC64 *Autor:* @${data.author.nickname}\n` : '') +
        (data.title ? `\uD83D\uDCDD ${data.title.slice(0, 100)}` : ''),
      parse_mode: 'Markdown',
    });

    await bot.deleteMessage(chatId, msgEspera.message_id);

    return bot.sendMessage(
      chatId,
      `\u2728 *Quieres descargar otro?* Pega el link o elige una plataforma \uD83D\uDC47`,
      { ...MENU_KEYBOARD }
    );
  }

  throw new Error('TikTok: no se encontro video ni fotos');
}

// ─── Downloader: Instagram / Facebook / Historias ────────────────────────────

async function downloadWithYtDlp(chatId, url, platform) {
  const isStory = platform === 'instagram_story';
  const emoji   = (platform === 'instagram' || isStory) ? '\uD83D\uDCF8' : '\uD83D\uDCD8';
  const nombre  = isStory
    ? 'Historia de Instagram'
    : platform === 'instagram' ? 'Instagram' : 'Facebook';

  // Verificar cookies para historias
  if (isStory && !fs.existsSync(COOKIES_PATH)) {
    return bot.sendMessage(
      chatId,
      `\uD83C\uDF6A *Se necesitan cookies para descargar historias*\n\n` +
      `*Como configurarlo:*\n` +
      `1. Instala la extension *"Get cookies.txt LOCALLY"* en Chrome\n` +
      `2. Entra a instagram.com con tu cuenta\n` +
      `3. Haz clic en la extension y exporta como \`cookies.txt\`\n` +
      `4. Pon el archivo en la misma carpeta que el bot\n` +
      `5. Reinicia el bot con \`node bot.js\``,
      { parse_mode: 'Markdown', ...MENU_KEYBOARD }
    );
  }

  const base   = tempFilePath();
  const output = base + '.%(ext)s';

  const msgEspera = await bot.sendMessage(
    chatId,
    `\uD83D\uDD0D *Analizando ${nombre}...*\n\n\`${progressBar(10)}\``,
    { parse_mode: 'Markdown' }
  );

  let filePath = null;

  try {
    await bot.editMessageText(
      `\u2B07\uFE0F *Descargando ${nombre}...*\n\n\`${progressBar(40)}\``,
      { chat_id: chatId, message_id: msgEspera.message_id, parse_mode: 'Markdown' }
    );

    // Opciones de yt-dlp — con cookies si es historia
    const ytdlpOptions = {
      output:              output,
      format:              'best[ext=mp4]/best[ext=webm]/best',
      noPlaylist:          true,
      noCheckCertificates: true,
    };

    if (isStory) {
      ytdlpOptions.cookies = COOKIES_PATH;
    }

    await youtubedl(url, ytdlpOptions);

    const dir   = path.dirname(base);
    const bName = path.basename(base);
    const files = fs.readdirSync(dir).filter(f => f.startsWith(bName));

    if (files.length === 0) throw new Error('No se encontro el archivo descargado');
    filePath = path.join(dir, files[0]);

    const sizeMB = fileSizeMB(filePath);

    if (sizeMB > 49) {
      await bot.deleteMessage(chatId, msgEspera.message_id);
      return bot.sendMessage(
        chatId,
        `\u26A0\uFE0F *Video demasiado grande*\n\n` +
        `El video pesa *${sizeMB.toFixed(1)} MB* y supera el limite de Telegram (50 MB).\n\n` +
        `_Intenta con un video mas corto._`,
        { parse_mode: 'Markdown', ...MENU_KEYBOARD }
      );
    }

    await bot.editMessageText(
      `\uD83D\uDCE4 *Enviando a Telegram...*\n\n\`${progressBar(85)}\`\n_Peso: ${sizeMB.toFixed(1)} MB_`,
      { chat_id: chatId, message_id: msgEspera.message_id, parse_mode: 'Markdown' }
    );

    await bot.sendVideo(chatId, fs.createReadStream(filePath), {
      caption:
        `${emoji} *${nombre} descargado* \u2705\n` +
        `\uD83D\uDCE6 Peso: ${sizeMB.toFixed(1)} MB`,
      parse_mode:         'Markdown',
      supports_streaming: true,
    });

    await bot.deleteMessage(chatId, msgEspera.message_id);

    await bot.sendMessage(
      chatId,
      `\u2728 *Quieres descargar otro?* Pega el link o elige una plataforma \uD83D\uDC47`,
      { ...MENU_KEYBOARD }
    );

  } finally {
    cleanUp(filePath);
  }
}

// ─── Manejador principal de mensajes ─────────────────────────────────────────

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text?.trim();

  if (!text || text.startsWith('/')) return;

  const platform = detectPlatform(text);

  if (!platform) {
    return bot.sendMessage(
      chatId,
      `\u274C *Link no reconocido*\n\n` +
      `Solo acepto links de:\n` +
      `\u2022 \uD83C\uDFB5 TikTok\n` +
      `\u2022 \uD83D\uDCF8 Instagram (posts, reels, historias)\n` +
      `\u2022 \uD83D\uDCD8 Facebook\n\n` +
      `_Asegurate de copiar el link completo._`,
      { parse_mode: 'Markdown', ...MENU_KEYBOARD }
    );
  }

  try {
    if (platform === 'tiktok') {
      await downloadTikTok(chatId, text);
    } else {
      await downloadWithYtDlp(chatId, text, platform);
    }
  } catch (error) {
    console.error(`[${platform.toUpperCase()}] Error:`, error?.message || error);
    bot.sendMessage(
      chatId,
      `\u274C *No pude descargar ese contenido*\n\n` +
      `*Posibles causas:*\n` +
      `\u2022 \uD83D\uDD12 Cuenta privada\n` +
      `\u2022 \uD83D\uDDD1\uFE0F Video eliminado\n` +
      `\u2022 \uD83C\uDF10 Region bloqueada\n` +
      (platform === 'instagram_story' ? `\u2022 \uD83C\uDF6A Cookies expiradas o invalidas\n` : '') +
      `\n_Intenta con otro link._`,
      { parse_mode: 'Markdown', ...MENU_KEYBOARD }
    );
  }
});
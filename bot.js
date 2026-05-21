const TelegramBot = require('node-telegram-bot-api');
const axios      = require('axios');
const youtubedl  = require('youtube-dl-exec');
const path       = require('path');
const fs         = require('fs');
const os         = require('os');

const TOKEN = '8711239939:AAGxPIDdDTiA_D1oNgF7oALgcEnNf05EawA';
const bot   = new TelegramBot(TOKEN, { polling: true });

console.log('Bot encendido ✅');

// ─── Utilidades ──────────────────────────────────────────────────────────────

function detectPlatform(url) {
  if (url.includes('tiktok.com') || url.includes('vm.tiktok.com')) return 'tiktok';
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

// ─── Downloader: TikTok (tikwm.com — rápido, sin instalar nada) ──────────────

async function downloadTikTok(chatId, url) {
  await bot.sendMessage(chatId, '⏳ Descargando TikTok...');

  const res  = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
  const data = res.data?.data;

  if (!data) throw new Error('tikwm no devolvió datos');

  // Álbum / slideshow de fotos
  if (data.images?.length > 0) {
    for (const img of data.images) await bot.sendPhoto(chatId, img);
    return bot.sendMessage(chatId, '✅ Fotos de TikTok descargadas');
  }

  // Video
  if (data.play) {
    return bot.sendVideo(chatId, data.play, {
      caption: `✅ *${data.author?.nickname || 'TikTok'}*\n${data.title || ''}`,
      parse_mode: 'Markdown',
    });
  }

  throw new Error('TikTok: no se encontró video ni fotos');
}

// ─── Downloader: Instagram / Facebook (yt-dlp — el más confiable) ────────────

async function downloadWithYtDlp(chatId, url, platform) {
  const emoji  = platform === 'instagram' ? '📸' : '📘';
  const nombre = platform === 'instagram' ? 'Instagram' : 'Facebook';
  const base   = tempFilePath();
  const output = base + '.%(ext)s';

  await bot.sendMessage(chatId, `⏳ Descargando ${nombre}...`);

  let filePath = null;

  try {
    // yt-dlp descarga y guarda el archivo
    // IMPORTANTE: usamos un solo formato combinado para evitar necesitar ffmpeg
    await youtubedl(url, {
      output:              output,
      format:              'best[ext=mp4]/best[ext=webm]/best',
      noPlaylist:          true,
      noCheckCertificates: true,
    });

    // Buscar el archivo generado en /tmp con el timestamp base
    const dir      = path.dirname(base);
    const baseName = path.basename(base);
    const files    = fs.readdirSync(dir).filter(f => f.startsWith(baseName));

    if (files.length === 0) throw new Error('No se encontró el archivo descargado');
    filePath = path.join(dir, files[0]);

    const sizeMB = fileSizeMB(filePath);
    if (sizeMB > 49) {
      return bot.sendMessage(chatId,
        `❌ El video pesa ${sizeMB.toFixed(1)} MB y supera el límite de Telegram (50 MB).`);
    }

    await bot.sendVideo(chatId, fs.createReadStream(filePath), {
      caption:            `${emoji} ✅ Descargado de ${nombre}`,
      supports_streaming: true,
    });

  } finally {
    cleanUp(filePath);
  }
}

// ─── Comando /start ──────────────────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    '👋 ¡Hola! Envíame un link y te descargo el contenido.\n\n' +
    '✅ *Plataformas soportadas:*\n' +
    '• 🎵 TikTok\n' +
    '• 📸 Instagram (Reels, posts, carruseles)\n' +
    '• 📘 Facebook (videos públicos)',
    { parse_mode: 'Markdown' }
  );
});

// ─── Manejador principal ─────────────────────────────────────────────────────

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text?.trim();

  if (!text || text.startsWith('/')) return;

  const platform = detectPlatform(text);

  if (!platform) {
    return bot.sendMessage(
      chatId,
      '❌ Link no reconocido.\n\nSolo acepto links de:\n• TikTok\n• Instagram\n• Facebook'
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
      '❌ No pude descargar ese contenido.\n\n' +
      '_Posibles causas: cuenta privada, video eliminado o región bloqueada._',
      { parse_mode: 'Markdown' }
    );
  }
});
/**
 * UNATION English School - Telegram Bot Integration
 * 
 * Provides automated start handler and Telegram Mini App launch button.
 * Can be run standalone or invoked by the main server when TELEGRAM_BOT_TOKEN is set.
 */

import https from 'https';

export function initTelegramBot(): void {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webAppUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!token || token.trim() === '' || token === 'your_telegram_bot_token_here') {
    console.log('[Telegram Bot] TELEGRAM_BOT_TOKEN not provided. Skipping Telegram polling bot initialization.');
    return;
  }

  console.log('[Telegram Bot] Initializing Telegram Bot with Web App URL:', webAppUrl);

  let offset = 0;

  function telegramRequest(method: string, data: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(data);
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  async function pollUpdates() {
    try {
      const res = await telegramRequest('getUpdates', {
        offset,
        timeout: 30,
      });

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text.trim();

            if (text.startsWith('/start')) {
              await telegramRequest('sendMessage', {
                chat_id: chatId,
                text: `🎓 *Welcome to UNATION English School Level Check!* 🎓\n\n` +
                      `Take our comprehensive 120-question placement test to accurately determine your English proficiency level:\n\n` +
                      `• ⏱ *Duration:* 60 minutes\n` +
                      `• 📋 *Questions:* 120 questions (Grammar, Vocabulary & Reading)\n` +
                      `• 🏆 *Result:* Instant score, verified level, and personalized digital result certificate\n\n` +
                      `Click the button below to launch the test inside Telegram!`,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '🚀 Start Level Test',
                        web_app: { url: webAppUrl },
                      },
                    ],
                  ],
                },
              });
            }
          }
        }
      }
    } catch (err: any) {
      // Quiet fail if network or invalid token, wait before retrying
      await new Promise(r => setTimeout(r, 5000));
    }

    setTimeout(pollUpdates, 1500);
  }

  pollUpdates();
}

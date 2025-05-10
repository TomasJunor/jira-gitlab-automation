import { discordClient } from './apiClients.js';
import logger from './logger.js';
import sanitizeHtml from 'sanitize-html';

/**
 * Send a Discord embed via webhook.
 * @param {Array<Object>} tickets – list of { key, summary, assignee, fixVersion }
 * @param {string} fixVersion – e.g. '1.0.0'
 * @param {string} environment – e.g. 'QA' or 'PROD'
 */
async function sendDiscordMessage(tickets, fixVersion, environment) {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    logger.warn('No DISCORD_WEBHOOK_URL configured - skipping Discord notification.');
    return;
  }
  tickets.forEach(t => {
    console.log(`Ticket ${t.key} - Assignee: ${t.assigneeDiscordId}`);
  });
  const fields = tickets.map(t => ({
    name: `${t.key}: ${sanitizeHtml(t.summary)}`,
    value: [
      `👤 Assignee: <@${t.assigneeDiscordId}>`
    ].join('\n')
  }));

  const payload = {
    username: '🚀 Deploy Bot',
    embeds: [{
      title: `🚀 Despliegue de la versión **${fixVersion}** a **${environment}** completado!`,
      color: 0x00FF00,
      fields,
      timestamp: new Date().toISOString()
    }]
  };

  try {
    logger.info('Discord notification payload:', payload);
    await discordClient.post('', payload);
    logger.info('✅ Discord notification sent');
  } catch (err) {
    logger.error('❌ Failed to send Discord notification', { message: err.message });
  }
}

export { sendDiscordMessage };

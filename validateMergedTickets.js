#!/usr/bin/env node
import { config } from 'dotenv';
config();
import { getLastMergedTickets } from './gitlab.js';
import { addLabelToTicket } from './jira.js';
import logger from './logger.js';

async function addMergedLabelToTicketsInJira() {
  logger.info('Validando branches mergeados...');
  const mergedTickets = await getLastMergedTickets();
  if (!mergedTickets) return logger.info('No hay branches mergeados para procesar.');
  logger.info(`Agregando label a el/los branch(es) mergeados...`);

  const allTickets = Object.values(mergedTickets).flat();
  const promises = allTickets.map(ticket =>
    addLabelToTicket(ticket, 'Merged').catch(error => logger.error(`Error agregando label al ticket ${ticket.key}: ${error.message}`, { stack: error.stack }))
  );

  await Promise.all(promises);
  logger.info('✅ All labels processed.');
}

async function run() {
  try {
    await addMergedLabelToTicketsInJira();
    logger.info(`✅ Done processing.`);
    process.exit(0);
  } catch (err) {
    logger.error('Fatal error:', { message: err.message, stack: err.stack });
    process.exit(1);
  }
}
run();
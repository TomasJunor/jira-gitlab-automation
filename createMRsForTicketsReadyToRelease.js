#!/usr/bin/env node
import { config } from 'dotenv';
config();
import { findBranchesAndCreateMRs } from './gitlab.js';
import { getTicketsRtRToCreateMRs } from './jira.js';
import logger from './logger.js';

async function main() {
  try {
    const tickets = await getTicketsRtRToCreateMRs();
    if (!tickets.length) return logger.info('No hay tickets para procesar.');

    for (const ticket of tickets) {
      await findBranchesAndCreateMRs(ticket);
    }
  } catch (error) {
    logger.error(`Error: ${error.message}`, { stack: error.stack });
  }
}

async function run() {
  try {
    await main();
    logger.info(`✅ Done processing.`);
    process.exit(0);
  } catch (err) {
    logger.error('Fatal error:', { message: err.message, stack: err.stack });
    process.exit(1);
  }
}
run();

import { config } from 'dotenv';
config();
import fs from 'fs';
import { addFixVersionToJiraTicket, addLabelToTicket, getFixVersionId, createVersion } from './jira.js';
import logger from './logger.js';
import CommonUtilities from './CommonUtilities.js';
import { sendDiscordMessage } from './discord.js';

const CURRENT_VERSION = process.env.VERSION;
const ENVIRONMENT = process.env.AMBIENTE;

const environmentMap = {
  PROD: "prod",
  QA: "release"
}

async function main() {
  if (ENVIRONMENT == "EVO") return logger.info('Para este deploy no hago nada...');
  logger.info('Validando branches mergeados...');
  const fileTickets = JSON.parse(fs.readFileSync(process.env.TICKETS_FILE_NAME, 'utf8'));
  
  const mergedTickets = fileTickets.filter(ticket => {
    return (ticket.target_branch == environmentMap[ENVIRONMENT] ) && (ticket.merged && !ticket.deployed);
  });
  if (!mergedTickets.length) return logger.info('No hay cambios en este build.');
  logger.info(`Agregando fixVersion ${mergedTickets.length > 1 ? "a los branches mergeados" : "al branch mergeado"} a release o prod...`);

  mergedTickets.forEach(ticket => {
    logger.debug(`${ticket.key} - ${JSON.stringify(ticket)}`);
  });

  const fixVersion = getCurrentFixVersion();

  let fixVersionObj = await getFixVersionId(fixVersion);
  if (!fixVersionObj) {
    const newVersion = await createVersion(versionName);
    fixVersionObj = {
      id: newVersion.id,
      name: newVersion.name,
    };
  }
  
  let mergedTicketsPromises = mergedTickets.map(async ticket => {
    ticket.deployed = true;
    ticket.fixVersion = fixVersionObj.name;
    await addFixVersionToJiraTicket(ticket.key, fixVersionObj).catch(error => {
      logger.error(`Error agregando fixVersion al ticket ${ticket.key}:`, { message: error.message, stack: error.stack });
    });
    await addLabelToTicket(ticket, 'Deployed').catch(error => {
      logger.error(`Error agregando label al ticket ${ticket.key}:`, error.response ? error.response.data : error.message);
    });
    console.log("\n");
  });

  await Promise.all(mergedTicketsPromises);

  const deduplicatedTickets = CommonUtilities.deduplicateArray(fileTickets, mergedTickets);

  
  await sendDiscordMessage(mergedTickets, fixVersionObj.name, ENVIRONMENT).catch(error => {
    logger.error(`Error enviando mensaje a Discord:`, error.response ? error.response.data : error.message);
  });
  fs.writeFileSync(process.env.TICKETS_FILE_NAME, JSON.stringify(deduplicatedTickets, null, 2), 'utf8');
}

function getCurrentFixVersion() {
  return CURRENT_VERSION;
}

try {
  await main();
  logger.info(`✅ Done processing.`);
  process.exit(0);
} catch (error) {
  logger.error('Fatal error:', { message: error.message, stack: error.stack });
  process.exit(1);
}
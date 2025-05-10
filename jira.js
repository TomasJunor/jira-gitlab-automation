import fs from 'fs';
import constants from './constants.js';
import { jiraClient } from './apiClients.js';
import logger from './logger.js';

async function getTicketsRtRToCreateMRs() {
  const filePath = process.env.TICKETS_FILE_NAME || 'tickets.json';
  logger.info(`🔍 Buscando tickets en Jira...`);
  const jiraTickets = await getJiraTicketsReadyToRelease();
  logger.info(`✅ Encontre ${jiraTickets.length} tickets en Jira`);
  if (!jiraTickets.length) return []; // No hay tickets en Jira

  logger.info(`Encontrados:`);
  for (const ticket of jiraTickets) {
    logger.info(`📁  ${ticket.key}`);
  }

  // valido si existe el archivo de tickets.json
  if (fs.existsSync(filePath)) {
    // si existe, lo leo y parseo y lo comparo con los tickets que tengo en jira
    const fileTickets = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // si hay tickets en el archivo, los comparo con los que tengo
    let remainingTickets = jiraTickets.filter(ticket => !fileTickets.find(fileTicket => fileTicket.key == ticket.key))
      .filter(async ticket => {
        if (!ticket.parent) return true;
        let parentTicket = await getJiraTicketsById(ticket.parent.key);
        return parentTicket.issueType == 'Epic' && (parentTicket.labels.includes("Deployed") || parentTicket.labels.includes("Merged"));
      });

    remainingTickets = (await Promise.all(remainingTickets)).filter(Boolean);

    logger.info(`Tickets restantes luego de filtrar por trabajados y padre: ${remainingTickets.length}`);
    for (const ticket of remainingTickets) logger.info(`📁 ${ticket.key}\n`);

    // agregar atributos a cada ticket restante
    const enrichedRemainingTickets = remainingTickets.map(ticket => ({
      ...ticket,
      deployed: ticket.labels.includes("Deployed"),
      merged: ticket.labels.includes("Merged")
    }));

    // si no hay tickets restantes, retorno el archivo
    fs.writeFileSync(filePath, JSON.stringify([...fileTickets, ...enrichedRemainingTickets], null, 2), 'utf8');

    return remainingTickets;
  } else {
    // si no existe el archivo, lo creo y guardo los tickets
    fs.writeFileSync(filePath, JSON.stringify(jiraTickets, null, 2), 'utf8');
  }

  // si no hay tickets restantes, retorno los tickets de jira
  return jiraTickets;
}

async function getJiraTicketsReadyToRelease() {
  const jiraTickets = await jiraClient.get(`/rest/api/3/search/jql?jql=${process.env.JIRA_REQUEST_JQL}&fields=${process.env.JIRA_REQUEST_FIELDS}`);

  if (!jiraTickets.data.issues.length) return []; // No hay tickets en Jira
  return jiraTickets.data.issues.map(ticket => {
    const displayName = ticket.fields.assignee ? ticket.fields.assignee.displayName : 'Unassigned';
    const label = constants.TEAMS[Object.keys(constants.TEAM_NAMES).find(key => constants.TEAM_NAMES[key].includes(displayName))];
    const parent = ticket.fields.parent ? ticket.fields.parent : null;
    return {
      key: ticket.key,
      summary: ticket.fields.summary,
      fixVersions: ticket.fields.fixVersions.name,
      priority: ticket.fields.priority.name,
      statuscategorychangedate: new Date(ticket.fields.statuscategorychangedate),
      assignee: displayName,
      assigneeDiscordId: constants.DISCORD_IDS[displayName] || null,
      team: label,
      labels: ticket.fields.labels,
      parent
    }
  });
}

async function getJiraTicketsById(ticketId) {
  const jiraTicketResponse = await jiraClient.get(`/rest/api/3/issue/${ticketId}?fields=${process.env.JIRA_REQUEST_FIELDS}`);
  let jiraTicket = jiraTicketResponse.data;
  if (!jiraTicket) return;

  const displayName = jiraTicket.fields.assignee ? jiraTicket.fields.assignee.displayName : 'Unassigned';
  const label = constants.TEAMS[Object.keys(constants.TEAM_NAMES).find(key => constants.TEAM_NAMES[key].includes(displayName))];
  const parent = jiraTicket.fields.parent ? jiraTicket.fields.parent : null;
  return {
    key: jiraTicket.key,
    summary: jiraTicket.fields.summary,
    fixVersions: jiraTicket.fields.fixVersions.name,
    priority: jiraTicket.fields.priority.name,
    statuscategorychangedate: new Date(jiraTicket.fields.statuscategorychangedate),
    assignee: displayName,
    team: label,
    labels: jiraTicket.fields.labels,
    issueType: jiraTicket.fields.issuetype.name,
    parent
  }
}

async function addLabelToTicket(ticket, label) {
  logger.info(`🔍 Agregando el label ${label} al ticket ${ticket.key}...`);
  try {
    if (process.env.DRY_RUN !== 'true') {
      await jiraClient.put(`/rest/api/3/issue/${ticket.key}`, { update: { labels: [{ add: label }] }, });
      logger.info(`✅ Label ${label} agregado a ${ticket.source_branch} - ${ticket.title} - ${ticket.updated_at} `);
    }
  } catch (error) {
    logger.error(`Error agregando label al ticket ${ticket.key}: ${error.message}`, { stack: error.stack });
  }
}

async function addFixVersionToJiraTicket(ticketKey, fixVersionObj) {
  logger.info(`FixVersion ID for ${fixVersionObj.name}: ${fixVersionObj.id}`);
  try {
    await addFixVersionToTicket(ticketKey, fixVersionObj.id);
    logger.info(`✅ FixVersion ${fixVersionObj.id} agregado a ${ticketKey}`);
  } catch (error) {
    logger.error(`Error agregando FixVersion ${fixVersionObj.name} a ${ticketKey}: ${error.message}`, { stack: error.stack });
  }
}

async function getFixVersionId(versionName) {
  logger.info(`🔍 Buscando FixVersionId de ${versionName} en Jira...`);
  try {
    const response = await jiraClient.get(`/rest/api/3/project/BCCL/versions`);
    const versions = response.data;
    const version = versions.find(v => v.name === versionName);
    if (!version) {
      logger.error(`Version ${versionName} no encontrada en Jira.`);
      return null;
    } else {
      return {
        id: version.id,
        name: versionName,
      }
    }
  } catch (error) {
    logger.error('Error fetching versions:', error.response?.data || error.message);
    throw error;
  }
}

async function addFixVersionToTicket(issueKey, newVersionId) {
  try {
    // Obtengo las versiones actuales del ticket
    const issue = await jiraClient.get(`/rest/api/3/issue/${issueKey}`);
    const currentFixVersions = issue.data.fields.fixVersions || [];
    logger.info(`Versiones actuales de ${issueKey}:`, currentFixVersions.map(v => v.name).join(', '));

    // Agrego la nueva version si no existe
    const versionAlreadySet = currentFixVersions.some(v => v.id === newVersionId);
    if (versionAlreadySet) return logger.info(`La version ya existe en el ${issueKey}`);

    const updatedFixVersions = [...currentFixVersions.map(v => ({ id: v.id })), { id: newVersionId }];

    // Update issue
    logger.info(`Agregando fixVersion a ${issueKey}...`);
    if (process.env.DRY_RUN !== 'true') await jiraClient.put(`/rest/api/3/issue/${issueKey}`, {
      fields: {
        fixVersions: updatedFixVersions
      }
    });
  } catch (error) {
    logger.error(`Error updating issue ${issueKey}: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

async function createVersion(versionName) {
  try {
    const response = await jiraClient.post(`/rest/api/3/version`, {
      name: versionName,
      project: process.env.JIRA_PROJECT_ID
    });
    return response.data;
  } catch (error) {
    logger.error('Error creating version:', error.response?.data || error.message);
    throw error;
  }
}

export { getTicketsRtRToCreateMRs, addLabelToTicket, addFixVersionToJiraTicket, getFixVersionId, createVersion };
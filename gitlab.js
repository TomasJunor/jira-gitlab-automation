import constants from './constants.js';
import fs from 'fs';
import { DateTime } from 'luxon';
import logger from './logger.js';
import { gitlabClient } from './apiClients.js';
import CommonUtilities from './CommonUtilities.js';


function getGitlabToken() {
  const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
  if (!GITLAB_TOKEN) throw new Error("GITLAB_TOKEN is not defined in .env");
  return GITLAB_TOKEN;
}

async function findBranchesAndCreateMRs(ticket) {
  const GITLAB_PROJECTS = constants.GITLAB_PROJECTS;
  const GITLAB_TOKEN = getGitlabToken();

  const issueKey = ticket.key;

  logger.info(`🔍 Buscando branches con key ${issueKey}...`);
  for (const projectId of Object.keys(GITLAB_PROJECTS)) {

    logger.info(`📁 Buscando en ${GITLAB_PROJECTS[projectId].name}`);
    const { data: branches } = await gitlabClient.get(`/projects/${projectId}/repository/branches?private_token=${GITLAB_TOKEN}&regex=${issueKey}`);

    const matchingBranches = branches.filter(b => b.name.includes(issueKey));
    logger.info(`✅ Encontre ${matchingBranches.length} branch(es): ${matchingBranches.map(b => b.name).join(', ')}`);

    for (const branch of matchingBranches) {
      // Check if MR already exists to avoid duplicates
      const { data: existingMRs } = await gitlabClient.get(`/groups/1092/merge_requests?private_token=${GITLAB_TOKEN}&state=opened`);

      const filteredMRList = existingMRs.filter(mr => mr.project_id == projectId && mr.source_branch.includes(branch.name) && mr.target_branch === 'release');

      if (filteredMRList.length > 0) {
        logger.info(`⚠️ el MR ya existe para el branch ${branch.name} en el proyecto ${projectId}`);
        continue;
      }

      let params = {
        source_branch: branch.name,
        target_branch: branch.name.split('/')[0].toLowerCase() == 'hotfix' ? 'prod' : 'release',
        title: `[${issueKey}] - Ready to Release. ${ticket.summary}`,
        description: `${ticket.summary} \n\n ${ticket.priority} \n\n ${ticket.assignee} \n\n ${ticket.team}`,
        labels: ticket.team,
      };
      logger.info(`🚀 Creando MR para el branch ${branch.name} hacia ${params.target_branch} en ${projectId}`);
      if (process.env.DRY_RUN !== 'true') await gitlabClient.post(`/projects/${projectId}/merge_requests`, params, {
        headers: {
          'PRIVATE-TOKEN': GITLAB_TOKEN,
          'Content-Type': 'application/json'
        }
      });

      logger.info(`🚀 MR Creado para el branch ${branch.name} en ${projectId}`);
    }
  }
  logger.info('✅ Done processing.\n');
}

async function getLastMergedTickets() {
  const GITLAB_PROJECTS = constants.GITLAB_PROJECTS;
  const GITLAB_TOKEN = getGitlabToken();
  let allMergedTickets = {};

  const nowInSaoPaulo = DateTime.now().setZone('America/Sao_Paulo');
  const nowInUTC = nowInSaoPaulo.toUTC().toISO();
  let date = nowInUTC;
  if (fs.existsSync(`lastUpdatedDate.txt`)) date = fs.readFileSync(`lastUpdatedDate.txt`, 'utf8');

  for (const projectId of Object.keys(GITLAB_PROJECTS)) {
    logger.info(`📁 Buscando en ${GITLAB_PROJECTS[projectId].name}`);

    const { data: mergedMRsInRelease } = await gitlabClient.get(`/projects/${projectId}/merge_requests?private_token=${GITLAB_TOKEN}&state=merged&updated_after=${date}&target_branch=release`);
    const { data: mergedMRsInProd } = await gitlabClient.get(`/projects/${projectId}/merge_requests?private_token=${GITLAB_TOKEN}&state=merged&updated_after=${date}&target_branch=prod`);

    const mergedReleaseTickets = mergedMRsInRelease.map(mr => {
      const parts = mr.source_branch.split('/');
      return {
        title: mr.title,
        source_branch: mr.source_branch,
        target_branch: mr.target_branch,
        updated_at: mr.updated_at,
        key: parts[1].match(/BCCL-\d*/)[0],
        projectId,
        merged: true
      };
    }).filter(mr => !!mr);
    const mergedProdTickets = mergedMRsInProd.map(mr => {
      const parts = mr.source_branch.split('/');
      return {
        title: mr.title,
        source_branch: mr.source_branch,
        target_branch: mr.target_branch,
        updated_at: mr.updated_at,
        key: parts[1].match(/BCCL-\d*/)[0],
        projectId,
        merged: true
      };
    }).filter(mr => !!mr);

    const mergedTickets = [...mergedMRsInRelease, ...mergedMRsInProd];

    console.log("\n");
    logger.info(`✅ Encontre ${mergedTickets.length} Branches(s) mergeados`);

    if (mergedTickets.length) {
      const filePath = `${process.env.TICKETS_FILE_NAME || 'tickets.json'}`;
      const fileTickets = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      const deduplicatedTickets = CommonUtilities.deduplicateArray(fileTickets, mergedTickets);

      fs.writeFileSync(filePath, JSON.stringify(deduplicatedTickets, null, 2), 'utf8');
      allMergedTickets[projectId] = mergedTickets;
    }
  }

  if (process.env.DRY_RUN !== 'true') fs.writeFileSync(`lastUpdatedDate.txt`, nowInUTC, 'utf8');
  Object.keys(allMergedTickets).forEach(projectId => {
    allMergedTickets[projectId].forEach(mr => {
      logger.info(`🔍 ${GITLAB_PROJECTS[projectId].name} - ${mr.source_branch} - ${mr.title} - ${mr.updated_at}`);
    });
  });
  return allMergedTickets;
}

export { findBranchesAndCreateMRs, getLastMergedTickets };

import { config } from 'dotenv';
config();
import axios from 'axios';
import logger from './logger.js';

const gitlabClient = axios.create({
  baseURL: process.env.GITLAB_BASE_URL,
  headers: { 'PRIVATE-TOKEN': process.env.GITLAB_TOKEN }
});

gitlabClient.interceptors.request.use(req => {
  logger.debug(`→ ${req.method.toUpperCase()} ${req.url}`);
  return req;
});
gitlabClient.interceptors.response.use(
  res => (logger.debug(`← ${res.status} ${res.config.url}`), res),
  err => (logger.error(err.message), Promise.reject(err))
);

const jiraClient = axios.create({
  baseURL: process.env.JIRA_URL,
  auth: {
    username: process.env.JIRA_USER,
    password: process.env.JIRA_TOKEN
  }
});

jiraClient.interceptors.request.use(req => {
  logger.debug(`[REQUEST] ${req.method.toUpperCase()} ${req.url}`);
  return req;
});
jiraClient.interceptors.response.use(
  res => (logger.debug(`[RESPONSE] ${res.status} ${res.config.url}`), res),
  err => (logger.error(err.message), Promise.reject(err))
);

const discordClient = axios.create({
  baseURL: process.env.DISCORD_WEBHOOK_URL,
  headers: { 'Content-Type': 'application/json' }
});

discordClient.interceptors.request.use(req => {
  logger.debug(`[REQUEST] ${req.method.toUpperCase()} ${req.url}`);
  return req;
});
discordClient.interceptors.response.use(
  res => (logger.debug(`[RESPONSE] ${res.status} ${res.config.url}`), res),
  err => (logger.error(err.message), Promise.reject(err))
);

export { gitlabClient, jiraClient, discordClient };

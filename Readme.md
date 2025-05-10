# Jira + GitLab Automation Script 🚀

Automate your dev team's workflow with this Node.js script that connects **Jira** and **GitLab** to streamline ticket tracking and merge request creation.

## 🔧 What It Does
- Checks Jira for tickets in specific workflow stages
- Automatically creates Merge Requests in GitLab for relevant tickets
- Updates ticket statuses to reflect progress
- Saves time, reduces human error, and improves team flow

## 🧰 Tech Stack
- Node.js
- Axios
- dotenv

## ⚙️ Setup
1. Clone this repo
2. Run `npm install`
3. Create a `.env` file with your Jira/GitLab credentials and project info
4. Customize your workflow settings (see `config.js`)
5. Run with: `node index.js`

## ⚙️ Environment Variables

| Name                         | Description                                                        |
|------------------------------|--------------------------------------------------------------------|
| `GITLAB_BASE_URL`            | e.g. `https://gitlab.com/api/v4/`                                  |
| `GITLAB_TOKEN`               | Personal Access Token                                              |
| `JIRA_URL`                   | e.g. `https://atlassian.net/`                                      |
| `JIRA_USER`, `JIRA_TOKEN`    | Basic auth para la API de Jira                                     |
| `JIRA_REQUEST_JQL`           | JQL to search for tickets that need MR                             |
| `JIRA_REQUEST_FIELDS`        | Comma-separated fields, e.g. `summary,assignee,labels,parent`      |
| `TICKETS_FILE_NAME`          | (opcional) store local de tickets, default `tickets.json`          |
| `LOG_LEVEL`                  | (opcional) `debug`/`info`/`warn`/`error` (default: `info`)         |
| `DRY_RUN`                    | (`true` or `false`) skip actual writes/API calls                   |
| `DISCORD_WEBHOOK_URL`        | Discord Webhook URL to send notifications                          |

## 🧰 Usage

All commands are exported scripts — you can run them directly:

```bash
# Create MRs for Jira tickets:
node createMRsForTicketsReadyToRelease.js

# Add label "Merged" a to merged tickets:
node validateMergedTickets.js

# After a deploy (Jenkins), Adds FixVersion and Label “Deployed” to Tickets:
node addFixVersionToDeployedTickets.js
```


## 🤔 Why Use This?
Tired of:

- Manually creating Merge Requests for every task?

- Forgetting to update Jira tickets?

- Spending more time managing your flow than coding?

This script was built to solve those headaches.

# 👨‍💻 Built By
[Tomas Junor](https://github.com/TomasJunor) – Fullstack Developer & Automation Enthusiast


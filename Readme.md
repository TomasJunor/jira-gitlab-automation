# Deployment Automation

Scripts para automatizar el proceso de despliegue de tickets de Jira a GitLab:

- Obtener tickets de Jira que esten "Ready to Release" y crear un MR en GitLab
- Trackear los tickets de Jira que fueron mergeados y agregar etiquetas
- Etiquetar los tickets de Jira con la version de despliegue y "Deployed" una vez que el build haya sido exitoso

---

## 📋 Prerequisites

- GitLab Personal Access Token (`GITLAB_TOKEN`)  
- Jira credentials (`JIRA_USER` + `JIRA_TOKEN`) 
- Variables de entorno en `.env`  

---

## ⚙️ Environment Variables

| Name                         | Description                                                        |
|------------------------------|--------------------------------------------------------------------|
| `GITLAB_BASE_URL`            | e.g. `https://gitlab.globallogic.com/api/v4/`                      |
| `GITLAB_TOKEN`               | Personal Access Token                                              |
| `JIRA_URL`                   | e.g. `https://globallogic-velocity.atlassian.net/`                 |
| `JIRA_USER`, `JIRA_TOKEN`    | Basic auth para la API de Jira                                     |
| `JIRA_REQUEST_JQL`           | JQL para buscar tickets que necesiten MR                           |
| `JIRA_REQUEST_FIELDS`        | Comma-separated fields, e.g. `summary,assignee,labels,parent`      |
| `TICKETS_FILE_NAME`          | (opcional) store local de tickets, default `tickets.json`          |
| `LOG_LEVEL`                  | (opcional) `debug`/`info`/`warn`/`error` (default: `info`)         |
| `DRY_RUN`                    | (`true` or `false`) skip actual writes/API calls                   |

---

## 🚀 Installation

1. Clonar repo
2. `npm install`
3. Cargar el `.env`

---

## 🧰 Usage

All commands are exported scripts — you can run them directly:
Todos los comandos son scripts independientes — se pueden ejecutar directamente:

```bash
# Create MRs for Jira tickets:
node createMRsForTicketsReadyToRelease.js

# Agrega label "Merged" a los tickets mergeados:
node validateMergedTickets.js

# Despues de un deploy de Jenkins, agrega FixVersion y Label “Deployed” a los tickets:
node addFixVersionToDeployedTickets.js
```

ToDOs:
4. Dar aviso a Jira cuando se despliega un ticket.
5. Campos de Jenkis con valores default pero dinamico.
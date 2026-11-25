---
title: "Observability: know before I notice"
summary: "Metrics, logs and uptime checks across every service, with alerts that reach me in Discord before a user would complain."
order: 3
stack: ["Prometheus", "Grafana", "Loki", "Uptime Kuma", "Discord"]
metric: "24 alert rules, 19 monitors"
---
I wanted the lab to tell me when something is wrong, so one container, hank (monitoring), runs Prometheus, Grafana and Uptime Kuma, and another, gomez (logs), runs Loki.

Prometheus scrapes hosts, the GPU and the AI services. Loki collects logs from nearly every service, labelled by machine and service. Uptime Kuma runs about 19 checks on user-facing endpoints and DNS. Grafana holds 24 alert rules, grouped by area such as AI, hardware and individual apps, and routes them to a Discord channel.

One design choice is checking from the outside in. A metrics alert says a component is unhealthy, while an uptime check says whether a person can actually use the service, and the "service down" alert fires on the second. Backup and agent jobs also report in through Uptime Kuma push monitors, so a job that silently stops running turns into an alert.

An AI agent reads the logs for a daily error digest and a weekly report, so I get a summary instead of a wall of text.

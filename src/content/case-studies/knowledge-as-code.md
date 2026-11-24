---
title: "Knowledge as code: a shared vault"
summary: "An Obsidian vault, versioned in git, is the memory and source of truth shared by me and both agents."
order: 6
stack: ["Obsidian", "Markdown", "Git", "Bind mounts", "Hooks"]
metric: "Git-versioned, 15-minute commits"
---
Agents forget between sessions, so I gave them a shared memory: an Obsidian vault of plain Markdown on the Proxmox host, mounted into both agents' containers.

It has a fixed structure. An inbox holds raw input that is never edited after intake. A wiki describes hosts, services and runbooks. Dated decision records capture what I chose and why, and dated logs record every change with how it was verified and which snapshot protects it. A hook loads the vault's current state when an agent session starts.

The decision I care about is ownership. Each agent owns specific folders, and edits to the other's notes go through a proposal in the inbox. Helper scripts do targeted edits that must match exactly once, and they refuse text that looks like a secret.

The vault is auto-committed to git every 15 minutes, so a bad edit is a revert away. The result is that I, a future agent or a recruiter can reconstruct why the lab looks the way it does.

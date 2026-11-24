---
title: "AI agents that run the lab, with guardrails"
summary: "Two AI agents administer the lab day to day, bounded by rules that hooks enforce rather than politely request."
order: 1
stack: ["Claude Code", "Hermes Agent", "Discord", "Proxmox VE 9", "Python hooks"]
metric: "2 agents, hook-enforced rules"
---
I run the lab with two agents. "flynn" is a Claude Code instance in its own container, and I drive it from my phone or laptop through Remote Control. "Tuco" is a Hermes agent I talk to in Discord for quick checks and documentation.

flynn works as an orchestrator. The main session plans, decides and reviews. Cheap read-only work goes to small Haiku subagents or to Tuco, Sonnet executes plans I have approved, and an auditor subagent checks every change before it is reported done.

The interesting decision was where to put the rules. Written instructions drift, so the important ones are enforced by guard hooks that run before each tool call: snapshot before risky changes, no hard deletes, secrets never printed. The agent cannot talk its way around them.

A separate sandbox VM, "superlab", is top secret and tightly jailed.

The result is that I can ask for a change from my phone and get a snapshot, a verified change and a log entry, with a hard ceiling on the damage a mistake can do.

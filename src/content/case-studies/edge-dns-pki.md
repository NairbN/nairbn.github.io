---
title: "Edge, DNS and an internal CA"
summary: "Every internal web service gets a friendly name and trusted HTTPS through one reverse proxy, with secure remote access over Tailscale."
order: 5
stack: ["Caddy", "AdGuard Home", "Tailscale", "Internal CA", "Proxmox firewall"]
metric: "One CA, one front door"
---
I wanted every service reachable by a clean name with real HTTPS, even though nothing is exposed to the internet.

gus (reverse proxy) runs Caddy and acts as an internal certificate authority, issuing certificates for all internal sites. AdGuard Home (DNS) maps those names to the proxy with wildcard-style rewrites, so adding a service is one DNS entry and one proxy block. ed (subnet router) runs Tailscale, so my phone and laptops reach the lab from anywhere, with split DNS sending internal names to AdGuard.

Addressing follows a rule I enforce: services live in role blocks of ten, and a service's ID is 100 plus the last part of its address. Looking at an ID tells me where it lives, and I renumbered everything to match. The Proxmox firewall is default-deny.

The cost of an internal CA is that every device must trust the root certificate before sites load. That caught me on a phone once (see the lessons), so installing it is now a documented runbook step.

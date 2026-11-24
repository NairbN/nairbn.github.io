---
title: "Internal sites failed on my phone, but DNS was fine"
date: "2026-11-23"
summary: "Hours of network debugging ended at a missing root certificate on one device."
---
### Problem
Away from home over a VPN, my phone could not load any internal site and a password manager app showed a generic error. DNS resolved correctly, and one site seemed to work.

### Cause
The phone had never trusted my internal certificate authority, so every TLS handshake ended with the client rejecting the certificate. The site that "worked" was only a cached page.

### Fix
I installed the root certificate on the phone and marked it fully trusted. The step is now a runbook. A packet capture on the subnet router showed the signature: handshake completes, then a small client alert and close.

### Lesson
When one device fails on every internal site while DNS is fine, check certificate trust before blaming the network. Always test with a URL the browser has never cached.

---
title: "Renumbering the lab left backups behind"
date: "2026-11-12"
summary: "Moving guests to a tidy ID scheme broke backup retention in a way that took a week to surface."
---
### Problem
A week after I renumbered every guest to the ID-to-address scheme, the host's disk was almost full and nightly backups were failing every night.

### Cause
Retention prunes backups by guest ID. Backups under the old IDs were orphans that nothing would ever prune, and they had grown to tens of gigabytes.

### Fix
I measured the orphans, wrote a keep-list covering guests I wanted to retain, and had a cleanup list reviewed before any deletion. I then added orphan pruning to the renumbering checklist.

### Lesson
An ID change is a data migration for everything keyed on that ID, including retention. Add a backup-health check after any such change, and alert on failing jobs.

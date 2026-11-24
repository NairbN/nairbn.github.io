---
title: "Backups that are proven by restoring"
summary: "Nightly backups, snapshots before risky changes and automated restore tests, because an untested backup is only a hope."
order: 4
stack: ["Proxmox vzdump", "zstd", "Git", "Gitea", "Bash"]
metric: "Nightly, restore-tested"
---
I treat a backup as real only after I have restored it. Every guest gets a nightly vzdump in snapshot mode, compressed with zstd, and a short retention to protect the host's disk.

Before any risky change, the rule is a snapshot first. For the two guests that share the vault mount and cannot be snapshotted, a vzdump is taken instead.

A restore-tester agent takes the newest backup of a guest, restores it into an isolated scratch ID range, boots it, checks it and tears it down. I have used it on the admin agent's own container.

The bug that taught me the most: after I renumbered guests, retention pruned by ID, so the old IDs' backups became orphans that were never cleaned up and slowly filled the host's disk until jobs failed. I found it, documented the cleanup procedure and added it to the renumbering checklist.

The knowledge vault is a git repository auto-committed every 15 minutes and mirrored nightly to my Git server, behind a secret scanner that blocks the push if anything sensitive appears.

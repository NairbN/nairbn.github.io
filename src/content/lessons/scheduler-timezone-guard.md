---
title: "A correct timestamp made the scheduler skip jobs"
date: "2026-11-23"
summary: "Hand-editing a job's next-run time in UTC tripped a timezone safety check, so scheduled runs were silently skipped."
---
### Problem
After I set the next-run times of two recurring agent jobs by hand and restarted the service, the jobs did not run at their scheduled times.

### Cause
I wrote the instants in UTC, but the scheduler is configured for a local timezone. Its repair guard saw the offset mismatch, compared wall-clock times naively, and decided the runs were in the future.

### Fix
I stopped editing the job file directly. The safe options are to use the agent's own scheduling tools, restart so it recalculates, or write local time with the local offset.

### Lesson
A value can be correct and still break a system that interprets it differently. Use the tool that owns the data, and record the failure so the next session does not repeat it.

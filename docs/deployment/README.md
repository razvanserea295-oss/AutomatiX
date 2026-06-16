# Deployment roadmap — Promix Automatix

Working docs that track what's needed to ship the app from internal tool to
shippable .msi. Each stage is a single markdown file with checkbox tasks —
check them off as they land.

## Files

| File | Stage | Target |
|---|---|---|
| [00-done.md](./00-done.md) | ✓ Completed | Infra already in place |
| [01-release-blocking.md](./01-release-blocking.md) | Release-blocking | 4-5 working days |
| [02-quality-and-trust.md](./02-quality-and-trust.md) | Quality & trust | 3-4 working days |
| [03-ux-polish.md](./03-ux-polish.md) | UX polish | 3-4 working days |
| [04-longer-term.md](./04-longer-term.md) | Longer-term | 5-9 working days |

## Minimum path to first paying client

Stages **1 + 2** = ~8-9 days of focused work. Stage 3 can ship as a `.1`
minor update after real-user feedback. Stage 4 is optional for v1 GA.

## Dependency order

```
1.4 (package ai-service)     ──┐
1.5 (auto-generate token)    ──┼──> 1.1 (code signing) ──> 1.3 (CI)
                                │                          │
1.2 (update endpoint)        ──┘                          ▼
                                                      first .msi ship
```

Stage 2 can run in parallel with 1.1-1.3 (they touch different files).
Stage 3 gates on having at least one client running v1 (needs feedback).

## Conventions

- Every task has a time estimate in hours or days of focused work
- Blocking dependencies called out inline
- Cross-stage references use relative links: `[see 2.1](./02-quality-and-trust.md#21-crash-reporting-remote)`
- Mark done: `- [x]` and add a short note (PR number, commit sha, or date)

---
name: external-review-orchestrator
description: Use when Codex should coordinate multiple independent review passes across External Review Profiles, including Claude Bridge reviews, Antigravity Bridge reviews, Codex Gemini profile reviews, subagent reviews, ordinary plus adversarial reviewers, then reconcile findings and optionally fix verified issues.
---

# External Review Orchestrator

Coordinate requested external reviews without dumping nested CLI logs into chat. Bridge-specific execution is delegated to the `claude-bridge` and `antigravity-bridge` submodules/plugins; do not recreate local CLI command profiles in this project.

## Provider Routing

- Claude: use Claude Bridge from `claude-bridge/` in this source checkout, or the installed Claude Bridge plugin skills when available.
- Antigravity: use Antigravity Bridge from `antigravity-bridge/` in this source checkout, or the installed Antigravity Bridge plugin skills when available.
- Gemini: use `codex-gemini-profile`.
- Subagents: use available multi-agent tooling only when the user asks for subagent reviews and such tooling is available.

## Workflow

1. Inspect the local scope first with `git status --short`, `git diff --stat`, and targeted file reads when needed.
2. Build one shared scope statement. Use the same scope for every provider and reviewer count.
3. Run a real smoke test for every CLI provider. Do not treat `auth status`, `--version`, or profile file presence as sufficient.
4. If a provider smoke test fails, mark that provider blocked with the exact exit/error, skip its requested review runs, and continue with available reviewers unless the user explicitly required an all-provider stop.
5. Capture CLI output to files. In chat, report only status lines, output paths, verified findings, and fixes.
6. Keep every review pass read-only. Do not ask reviewers to edit files.
7. Reconcile all findings yourself. Verify file and line claims locally before editing or reporting them as true.
8. If the user asked to improve the code, patch only verified issues, then run relevant tests or validation.

## Claude Bridge

Use the submodule helper from the parent repository root:

```powershell
node .\claude-bridge\scripts\claude-bridge.mjs setup --json
node .\claude-bridge\scripts\claude-bridge.mjs review --scope "current git diff in this repository"
node .\claude-bridge\scripts\claude-bridge.mjs adversarial-review --scope "current git diff in this repository"
```

Use `--deep` or `--model claude-opus-4-8` only when the scope is high-risk or the user explicitly requests Opus. Otherwise let Claude Bridge default to `claude-sonnet-5`.

Claude Bridge owns Claude model normalization, prompt templates, result capture, and workflow-execution restrictions. If `claude-bridge/` is missing or not initialized, mark Claude blocked and tell the user to initialize the submodule; do not fall back to hand-written Claude CLI commands here.

## Antigravity Bridge

Use the submodule helper from the parent repository root:

```powershell
node .\antigravity-bridge\scripts\antigravity-bridge.mjs setup --json
node .\antigravity-bridge\scripts\antigravity-bridge.mjs review --scope "current git diff in this repository"
node .\antigravity-bridge\scripts\antigravity-bridge.mjs adversarial-review --scope "current git diff in this repository"
```

Use `--deep` only when the scope is high-risk or the user explicitly requests a deeper Antigravity model. Otherwise let Antigravity Bridge default to `Gemini 3.5 Flash (Medium)` for ordinary reviews and `Gemini 3.5 Flash (High)` for adversarial reviews.

Antigravity Bridge owns `agy` model normalization, prompt templates, transcript extraction, result capture, and workflow-execution restrictions. If `antigravity-bridge/` is missing or not initialized, mark Antigravity blocked and tell the user to initialize the submodule; do not fall back to hand-written `agy` CLI commands here.

## Gemini

Read `codex-gemini-profile` before running Gemini. Use this read-only shape:

```powershell
codex --profile gemini -s read-only -a never -C "C:\path\to\repo" exec --ephemeral "Review the current git diff. Do not modify files. Report only actionable correctness bugs, regressions, missing tests, or high-risk assumptions with file/line references."
```

For adversarial mode, preserve the same scope and ask Gemini to challenge implementation direction, design choices, assumptions, tradeoffs, and failure modes. Do not let Gemini rewrite the scope.

## Review Modes

- Normal review: prioritize correctness bugs, behavioral regressions, security risks, and missing tests.
- Adversarial review: challenge whether the change should ship; prioritize data loss, corruption, migrations, schema drift, concurrency, rollback, idempotency, trust boundaries, stale state, and missing tests.
- Rescue: use bridge-specific `rescue` only when the user asks for investigation, diagnosis, fix planning, or an explicitly constrained fix.

## Failure Gates

- Claude Bridge: `node .\claude-bridge\scripts\claude-bridge.mjs setup --json` must report `ready: true`.
- Antigravity Bridge: `node .\antigravity-bridge\scripts\antigravity-bridge.mjs setup --json` must report `ready: true`.
- Gemini: `codex --profile gemini ... exec --ephemeral ... "Respond with exactly: OK"` must exit 0 and write `OK`.
- Warnings are non-blocking only when the command exits 0 and produces the expected final answer.
- Never count a failed provider toward the requested reviewer total.

## Subagent Reviews

When subagents are requested, give each subagent the same scope and no-edit instruction. Do not pass your expected answer or suspected bug. Label outputs as `subagent-normal` or `subagent-adversarial`, then verify their claims like any other advisory result.

## Final Reporting

Report:

- requested versus completed reviewer counts by provider and mode;
- provider failures with the exact short error and log path;
- verified findings only, grouped by severity;
- patches made and validation commands run.

If a provider failed authentication, setup, or smoke testing, say it is blocked and name the exact command that failed. Do not imply that a skipped provider reviewed the code.

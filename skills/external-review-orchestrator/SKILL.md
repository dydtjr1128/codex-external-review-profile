---
name: external-review-orchestrator
description: Use when Codex should coordinate multiple independent review passes across External Review Profiles, including requests to run Claude CLI reviews, Codex Gemini profile reviews, subagent reviews, ordinary plus adversarial reviewers, then reconcile findings and optionally fix verified issues.
---

# External Review Orchestrator

Coordinate requested external reviews without dumping nested CLI logs into chat. Use this skill when the user invokes the whole External Review Profiles plugin or asks for a mix of Claude, Gemini, and subagent reviewers.

## Workflow

1. Inspect the local scope first: `git status --short`, `git diff --stat`, and targeted files when needed.
2. Read the provider skill before using that provider:
   - `claude-cli-profile` for Claude CLI.
   - `codex-gemini-profile` for Codex Gemini.
3. Build one shared scope statement. Use the same scope for every provider and reviewer count.
4. Normalize requested model names before running provider commands. For Claude Opus 4.8 requests, use `--model claude-opus-4-8`; do not pass invalid shorthand such as `opus4.8`.
5. Run a real smoke test for every CLI provider. Do not treat `auth status`, `--version`, or profile file presence as sufficient.
6. If a provider smoke test fails, mark that provider blocked with the exact exit/error, skip its requested review runs, and continue with available reviewers unless the user explicitly required an all-provider stop.
7. Capture CLI output to files. In chat, report only status lines, output paths, verified findings, and fixes.
8. Ask subagents for review only when a subagent/multi-agent tool is available. Keep prompts no-edit and scope-identical.
9. Reconcile all findings yourself. Verify file and line claims locally before editing or reporting them as true.
10. If the user asked to improve the code, patch only verified issues, then run relevant tests or validation.

## Model Normalization

For Claude, use model strings accepted by `claude --help`:

- latest Opus: `--model opus`;
- Opus 4.8 specifically: `--model claude-opus-4-8`;
- latest Sonnet: `--model sonnet`.

If the user says `opus4.8`, `opus 4.8`, or an obvious typo like `opsu4.8` while asking for a Claude review, normalize to `claude-opus-4-8`. If the CLI rejects a model with "There's an issue with the selected model", verify the alias with `claude --help` or a short `Respond with exactly: OK` smoke test before declaring Claude unavailable.

## CLI Capture Pattern

Capture Claude and Gemini output to files instead of pasting nested logs into chat.

Claude:

```powershell
$prompt = @'
You are an independent code reviewer.
Scope: current git diff in this repository.
Do not edit files.
Prioritize correctness bugs, behavioral regressions, security risks, and missing tests.
Return findings first, ordered by severity, with file/line references.
If there are no actionable findings, say that clearly and mention residual test gaps.
'@

$out = Join-Path (Get-Location) ".codex\external-review-profiles\run-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Force $out | Out-Null
$claudeModel = "claude-opus-4-8" # only when the user requested Opus 4.8
& claude -p $prompt --model $claudeModel --output-format json --no-session-persistence > (Join-Path $out "claude-normal-01.json") 2> (Join-Path $out "claude-normal-01.log")
```

Gemini:

```powershell
$prompt = @'
You are an independent code reviewer.
Scope: current git diff in this repository.
Do not edit files.
Prioritize correctness bugs, behavioral regressions, security risks, and missing tests.
Return findings first, ordered by severity, with file/line references.
If there are no actionable findings, say that clearly and mention residual test gaps.
'@

$out = Join-Path (Get-Location) ".codex\external-review-profiles\run-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Force $out | Out-Null
& codex --profile gemini -s read-only -a never -C (Get-Location) exec --ephemeral -o (Join-Path $out "gemini-normal-01.md") $prompt *> (Join-Path $out "gemini-normal-01.log")
```

For adversarial mode, use the same scope and switch only the reviewer stance:

```text
You are an adversarial software reviewer.
Scope: <same exact scope>
Do not edit files.
Try to find the strongest reasons this should not ship yet.
Prioritize data loss, corruption, migrations, schema drift, concurrency, rollback, idempotency, trust boundaries, stale state, and missing tests.
Report only material findings grounded in files, line numbers, or command output.
Return in Korean.
Start with Findings ordered by severity. If no actionable finding, say so clearly.
Then give a short structural verdict: solid parts, fragile parts, and top 3 improvements.
```

Use one shared `$out` directory when running multiple batches so results land together:

```powershell
$out = Join-Path (Get-Location) ".codex\external-review-profiles\run-$(Get-Date -Format yyyyMMdd-HHmmss)"
New-Item -ItemType Directory -Force $out | Out-Null
$claudeModel = "claude-opus-4-8" # only when the user requested Opus 4.8
& claude -p $prompt --model $claudeModel --output-format json --no-session-persistence > (Join-Path $out "claude-normal-01.json") 2> (Join-Path $out "claude-normal-01.log")
& claude -p $adversarialPrompt --model $claudeModel --output-format json --no-session-persistence > (Join-Path $out "claude-adversarial-01.json") 2> (Join-Path $out "claude-adversarial-01.log")
& codex --profile gemini -s read-only -a never -C (Get-Location) exec --ephemeral -o (Join-Path $out "gemini-normal-01.md") $prompt *> (Join-Path $out "gemini-normal-01.log")
& codex --profile gemini -s read-only -a never -C (Get-Location) exec --ephemeral -o (Join-Path $out "gemini-adversarial-01.md") $adversarialPrompt *> (Join-Path $out "gemini-adversarial-01.log")
```

Read Claude final text from the JSON `result` field and Gemini final text from the markdown file. Inspect logs only for failures.

## Failure Gates

- Claude: `claude auth status` can say logged in while `claude -p` still returns `401 Invalid authentication credentials`. The print-mode smoke test is the gate.
- Claude model strings: a failed `--model opus4.8` is not an auth failure; retry with `--model claude-opus-4-8` when the user requested Opus 4.8.
- Gemini: profile existence and `codex --profile gemini --version` are not enough. The `exec --ephemeral` smoke test must exit 0 and write `OK`.
- Warnings are non-blocking only when the command exits 0 and produces the expected final answer.
- Never count a failed provider toward the requested reviewer total.

## Subagent Reviews

When subagents are requested, use available multi-agent tooling if present. Give each subagent the same scope and no-edit instruction. Do not pass your expected answer or suspected bug. Label outputs as `subagent-normal` or `subagent-adversarial`, then verify their claims like any other advisory result.

## Final Reporting

Report:

- requested versus completed reviewer counts by provider and mode;
- provider failures with the exact short error and log path;
- verified findings only, grouped by severity;
- patches made and validation commands run.

If a provider failed authentication, say it is blocked by local credentials and name the exact command that failed. Do not imply that a skipped provider reviewed the code.

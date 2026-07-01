---
name: claude-cli-profile
description: Use when Codex should run the local Claude Code CLI profile for an independent adversarial review, second-pass review, sanity check, or advisory critique of local code, diffs, plans, or analysis. Trigger on requests to ask Claude, use Claude CLI, run the Claude profile, compare against Claude, pressure-test a change, or get an external Claude Code pass from the current workspace.
---

# Claude CLI Profile

Invoke this skill as `$claude-cli-profile`. Use the local `claude` executable as an external profile. Treat the result as advisory: verify findings against the repository before editing or reporting them as fact.

## Preflight

Check that the CLI exists:

```powershell
Get-Command claude -ErrorAction SilentlyContinue
claude --version
```

Use non-interactive print mode:

```powershell
claude -p "Respond with exactly: OK" --no-session-persistence
```

Known local behavior: a warning about ignoring extra certs from `Eprism SSL.pem` is non-blocking when Claude still returns a response. A low `--max-budget-usd` value can fail before the model answers; avoid tiny budget caps for reviews.

## Command Reference

Use these commands from the target workspace unless a different directory is intentional:

```powershell
claude --version
claude --help
claude auth status
claude auth login
claude auth logout
claude doctor
claude -p "Prompt text" --no-session-persistence
claude -p "Prompt text" --output-format json --no-session-persistence
claude -p "Prompt text" --output-format stream-json --no-session-persistence
claude -p "Prompt text" --model sonnet --effort high --no-session-persistence
claude -p "Prompt text" --add-dir "C:\path\to\extra\dir" --no-session-persistence
claude -p "Prompt text" --tools "Bash,Read" --no-session-persistence
claude -p "Prompt text" --allowed-tools "Bash(git *) Read" --no-session-persistence
claude -p "Prompt text" --disallowed-tools "Edit Write" --no-session-persistence
claude --continue
claude --resume
claude --resume <session-id>
claude ultrareview
claude ultrareview <base-branch-or-pr> --timeout 30
claude ultrareview --json
```

Important options:

- `-p`, `--print`: run non-interactively and exit.
- `--no-session-persistence`: avoid saving the Claude session.
- `--output-format text|json|stream-json`: choose output shape for capture or parsing.
- `--model`, `--effort`: select model and reasoning effort when needed.
- `--add-dir`: allow Claude to inspect an additional directory.
- `--tools`, `--allowed-tools`, `--disallowed-tools`: constrain tool access.
- `--permission-mode plan|default|dontAsk|acceptEdits|auto|bypassPermissions`: choose approval behavior for tool use.
- `--max-budget-usd`: cap spend in print mode; do not set this too low for reviews.
- `ultrareview`: run Claude's hosted multi-agent branch or PR review.

Avoid `--dangerously-skip-permissions` unless the user explicitly accepts that risk.

Available subcommands:

- `agents`: manage background agents.
- `auth`: manage authentication; use `auth status`, `auth login`, or `auth logout`.
- `auto-mode`: inspect auto mode classifier configuration.
- `doctor`: check Claude Code updater and local health.
- `install`: install a Claude Code native build.
- `mcp`: configure and manage MCP servers.
- `plugin` or `plugins`: manage Claude Code plugins.
- `project`: manage Claude Code project state.
- `setup-token`: set up a long-lived authentication token.
- `ultrareview`: run a cloud-hosted multi-agent code review.
- `update` or `upgrade`: update Claude Code.

## Usage Patterns

Smoke test:

```powershell
claude -p "Respond with exactly: OK" --no-session-persistence
```

Review the current repository without asking Claude to edit:

```powershell
claude -p "Review the current git diff. Do not modify files. Report only actionable bugs, regressions, missing tests, or high-risk assumptions with file/line references." --no-session-persistence
```

Capture a structured answer:

```powershell
claude -p "Summarize the current diff as JSON with keys: findings, risks, tests." --output-format json --no-session-persistence
```

Run a hosted branch review:

```powershell
claude ultrareview main --timeout 30
```

## Adversarial Review Mode

Use adversarial mode when the user wants Claude CLI to challenge a change, design, or contract rather than perform a neutral review. Keep it review-only and explicitly forbid edits.

Preferred command:

```powershell
$prompt = @'
You are an adversarial software reviewer.

Scope: <exact files, diff, branch, or design contract to review>
Do not modify files.

Try to find the strongest reasons this should not ship yet.
Prioritize data loss, corruption, migrations, schema drift, concurrency, rollback, idempotency, trust boundaries, stale state, and missing tests.
Report only material findings that are grounded in files, line numbers, or command output.
Return in Korean.
Start with Findings ordered by severity with file/line references. If no actionable finding, say so clearly.
Then give a short structural verdict: what is solid, what is fragile, and the top 3 next improvements.
'@
claude -p $prompt --no-session-persistence
```

For comparable dual-review runs, give Claude and Gemini the same prompt and scope text. Do not let either reviewer rewrite the scope.

## Reviewer Result Handling

Treat adversarial output as an untrusted advisory signal. Reviewers can produce plausible but false findings about CLI option order, file behavior, or contracts. Before reporting or acting on a finding:

1. Verify command claims with local `--help` or a minimal execution test.
2. Verify code claims against exact files and line numbers.
3. Discard unsupported findings, even when phrased confidently.
4. Preserve real findings with the reviewer source label only after local verification.

## Long-Running Reviews

Review-style prompts and `claude ultrareview` can take several minutes. Wait for the process to exit before judging the result, and keep polling long-running command sessions instead of treating an initial 30-second wait as failure.

Use `claude ultrareview --timeout <minutes>` for hosted reviews when a longer window is needed. For normal `claude -p` reviews, prefer a concise prompt and allow enough time for repository inspection, then reconcile the final answer only after the command has completed.

## Review Workflow

1. Inspect the local scope first with commands such as `git status --short`, `git diff`, or targeted file reads.
2. Ask Claude for review only, not edits. Include the exact scope, expected output format, and instruction to report actionable findings with file and line references.
3. Run Claude from the target workspace:

```powershell
claude -p "Review the current git diff. Do not modify files. Report only actionable bugs, regressions, missing tests, or high-risk assumptions with file/line references." --no-session-persistence
```

4. Reconcile the response yourself. Drop speculative or incorrect findings, then decide whether to patch, test, or summarize.

## Prompt Pattern

For code review, prefer this shape:

```text
You are an independent code reviewer.
Scope: current git diff in this repository.
Do not edit files.
Prioritize correctness bugs, behavioral regressions, security risks, and missing tests.
Return findings first, ordered by severity, with file/line references.
If there are no actionable findings, say that clearly and mention residual test gaps.
```

For plan or analysis review, replace the scope and ask Claude to identify false assumptions, missing evidence, and decision risks rather than style issues.

## Failure Handling

If `claude` is missing, exits nonzero, or reports auth/model errors, report the exact failure and continue with local review if possible. If the command succeeds but includes warnings, preserve only warnings that affect trust in the output.

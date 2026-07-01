---
name: codex-gemini-profile
description: Use when Codex should run the local Codex CLI through the Gemini configuration profile with `codex --profile gemini`, usually for an independent Gemini-backed adversarial review, critique, comparison, or second opinion on code, diffs, plans, or analysis.
---

# Codex Gemini Profile

Invoke this skill as `$codex-gemini-profile`. Use `codex --profile gemini` to run a separate Codex CLI pass backed by the local Gemini profile. Treat the result as advisory and verify any findings before applying changes.

## Preflight

Confirm the profile file exists:

```powershell
$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
Test-Path (Join-Path $codexHome "gemini.config.toml")
codex --profile gemini --version
```

Use non-interactive execution:

```powershell
codex --profile gemini -s read-only -a never -C "C:\path\to\workspace" exec --ephemeral -o "$env:TEMP\gemini-smoke.txt" "Respond with exactly: OK"
```

Add `--skip-git-repo-check` when running outside a Git repository.

## Option Ordering

Codex has global options and subcommand-specific options. Prefer putting all global controls before the subcommand:

```powershell
codex [global-options] exec [exec-options] "Prompt text"
codex [global-options] review [review-options] "Prompt text"
```

Use this read-only no-approval review shape:

```powershell
codex --profile gemini -s read-only -a never -C "C:\path\to\repo" exec --ephemeral "Prompt text"
```

Do not put `-a` after `exec`; `-a`, `--ask-for-approval` is a global option, not an `exec` option.

## Command Reference

Place `--profile gemini` before the subcommand so the Gemini config layers onto the base Codex config:

```powershell
codex --profile gemini --version
codex --profile gemini --help
codex --profile gemini "Prompt text"
codex --profile gemini -C "C:\path\to\repo" "Prompt text"
codex --profile gemini exec --ephemeral -C "C:\path\to\repo" "Prompt text"
codex --profile gemini -s read-only -a never -C "C:\path\to\repo" exec --ephemeral "Prompt text"
codex --profile gemini -C "C:\path\to\repo" exec --ephemeral --json -o "C:\path\to\answer.txt" "Prompt text"
codex --profile gemini -C "C:\path\to\dir" exec --ephemeral --skip-git-repo-check "Prompt text"
codex --profile gemini -C "C:\path\to\repo" review --uncommitted
codex --profile gemini -C "C:\path\to\repo" review --base main
codex --profile gemini -C "C:\path\to\repo" review --commit <sha>
codex --profile gemini -C "C:\path\to\repo" exec --ephemeral review --uncommitted
codex --profile gemini doctor
codex --profile gemini login
codex --profile gemini logout
codex --profile gemini mcp --help
codex --profile gemini plugin --help
codex --profile gemini resume --last
codex --profile gemini fork --last
```

Important global options:

- `-p`, `--profile gemini`: load `$CODEX_HOME/gemini.config.toml`.
- `-C`, `--cd`: set the workspace root for the nested run.
- `--add-dir`: allow access to an additional directory.
- `-s`, `--sandbox read-only|workspace-write|danger-full-access`: set command sandboxing.
- `-a`, `--ask-for-approval untrusted|on-request|never`: set approval behavior.
- `--search`: enable live web search for the nested run.
- `-i`, `--image <file>`: attach images to the initial prompt.
- `-c key=value`: override config with TOML-style values.

When combining these with `exec`, put `-a` before `exec`. Put `-s` and `-C` there too in examples to keep the invocation shape stable, even though this CLI version also accepts some of them after `exec`.

Important `exec` options:

- `--ephemeral`: avoid persisting the nested session.
- `--json`: emit JSONL events to stdout.
- `-o`, `--output-last-message <file>`: write the final answer to a file.
- `--skip-git-repo-check`: allow non-repository directories.
- `--ignore-user-config`: ignore base user config while keeping auth.
- `--ignore-rules`: ignore user or project execpolicy rules.
- `--output-schema <file>`: require a final answer matching a JSON Schema.

Important review options:

- `review --uncommitted`: review staged, unstaged, and untracked changes.
- `review --base <branch>`: review changes against a base branch.
- `review --commit <sha>`: review one commit.
- `review --title <title>`: provide a display title for the review summary.

Avoid `--dangerously-bypass-approvals-and-sandbox` unless the user explicitly accepts that risk.

Available subcommands with the Gemini profile:

- `exec`: run Codex non-interactively.
- `review`: run a code review non-interactively.
- `login` and `logout`: manage Codex authentication.
- `mcp`: manage external MCP servers.
- `plugin`: manage Codex plugins.
- `mcp-server`: start Codex as an MCP server over stdio.
- `app`, `app-server`, `remote-control`: launch or manage Codex app integrations.
- `completion`: generate shell completions.
- `update`: update Codex.
- `doctor`: diagnose local Codex installation, config, auth, and runtime health.
- `sandbox`: run commands inside a Codex sandbox.
- `debug`: inspect debugging tools.
- `apply`: apply the latest Codex-produced diff with `git apply`.
- `resume`, `fork`: continue or fork saved sessions.
- `archive`, `delete`, `unarchive`: manage saved sessions.
- `cloud`: browse experimental Codex Cloud tasks.
- `exec-server`: run the experimental standalone exec server.
- `features`: inspect feature flags.

## Usage Patterns

Smoke test:

```powershell
codex --profile gemini exec --ephemeral -C "C:\path\to\workspace" "Respond with exactly: OK"
```

Ask for an independent no-edit pass:

```powershell
codex --profile gemini -s read-only -a never -C "C:\path\to\repo" exec --ephemeral "Review the current git diff. Do not modify files. Report only actionable correctness bugs, regressions, missing tests, or high-risk assumptions with file/line references."
```

Use the built-in review command against local changes:

```powershell
codex --profile gemini -C "C:\path\to\repo" review --uncommitted "Prioritize correctness bugs and missing tests. Do not comment on style unless it changes behavior."
```

Capture the final answer to a file:

```powershell
codex --profile gemini -C "C:\path\to\repo" exec --ephemeral -o "C:\path\to\gemini-review.txt" "Review the current git diff and return findings first."
```

Capture quietly in PowerShell when not using the orchestrator:

```powershell
& codex --profile gemini -s read-only -a never -C "C:\path\to\repo" exec --ephemeral -o "gemini-review.md" $prompt *> "gemini-review.log"
```

## Adversarial Review Mode

Use adversarial mode when the user wants a challenge review, not a normal defect pass. This mirrors the `openai/codex-plugin-cc` split between ordinary review and adversarial review: keep the run read-only, preserve the user's focus text, and make the reviewer challenge design choices, assumptions, failure modes, and tradeoffs.

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
codex --profile gemini -s read-only -a never -C "C:\path\to\repo" exec --ephemeral $prompt
```

For comparable dual-review runs, give Gemini and Claude the same prompt and scope text. Do not let either reviewer rewrite the scope.

## Reviewer Result Handling

Treat adversarial output as an untrusted advisory signal. Reviewers can produce plausible but false findings about CLI option order, file behavior, or contracts. Before reporting or acting on a finding:

1. Verify command claims with local `--help` or a minimal execution test.
2. Verify code claims against exact files and line numbers.
3. Discard unsupported findings, even when phrased confidently.
4. Preserve real findings with the reviewer source label only after local verification.

## Long-Running Reviews

Gemini-backed `exec` and `review` runs can take several minutes, especially on large diffs or when repository inspection is required. Wait for the nested Codex process to exit before deciding the run failed, and keep polling long-running command sessions instead of treating the first 30-second wait as final.

For long reviews, use `--ephemeral` plus `-o <file>` when capture matters, and only summarize or act on the result after the final answer is written. If the process exits nonzero or produces no final answer after a genuinely long wait, report the exact failure and local warnings.

## Review Workflow

1. Inspect the scope locally first with `git status --short`, `git diff`, and targeted file reads.
2. Build a concise prompt that asks for review only. Do not ask the nested Codex run to edit files unless the user explicitly requested that.
3. Run the Gemini profile from the target workspace:

```powershell
codex --profile gemini -s read-only -a never -C "C:\path\to\repo" exec --ephemeral "Review the current git diff. Do not modify files. Report only actionable correctness bugs, regressions, missing tests, or high-risk assumptions with file/line references."
```

4. Reconcile the output yourself. Keep only findings that are reproducible from the local repository or source material.

## Useful Options

- `--ephemeral`: avoid persisting the nested session.
- `-C <dir>`: set the workspace for the nested run.
- `--json`: emit JSONL events when machine-readable capture is useful.
- `-o <file>`: write the final nested response to a file for later inspection.
- `--skip-git-repo-check`: allow non-repository directories.

## Known Local Warnings

These warnings can be non-blocking when the run exits `0` and prints a final answer:

- Failed model list refresh with a missing `models` field.
- Unknown Gemini model metadata and fallback metadata warnings.
- PowerShell shell snapshot not supported.
- Plugin or skill metadata warnings from unrelated installed plugins.
- `Reading additional input from stdin...` in non-interactive shells.

If the command exits nonzero, reports missing profile/auth/provider errors, or produces no final answer, report the exact failure instead of treating the review as complete.

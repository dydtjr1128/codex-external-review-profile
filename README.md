# External Review Profiles

Install Claude Bridge and Antigravity Bridge review workflows together as one Codex plugin.

This repository is an aggregate plugin and a version-pinned provider profile. It exposes provider-qualified review skills from one installation while keeping the provider repositories available at known commits.

## What This Is

- One installable plugin containing Claude Bridge and Antigravity Bridge skills.
- A version-pinned source profile for both provider implementations.
- An explicit, bounded provider-selection policy.

## What This Is Not

- It does not recursively load nested plugins.
- It does not infer a provider from a generic review request.
- It does not add automatic retries, deeper models, or extra review passes.

## Providers

- Claude Bridge runs only when the user explicitly selects Claude Bridge.
- Antigravity Bridge runs only when the user explicitly selects Antigravity Bridge.
- Running both providers requires an explicit request for both providers.
- Risk, scope, or an incomplete result never selects another provider automatically.

Provider details live in the submodule READMEs:

- `claude-bridge/README.md`
- `antigravity-bridge/README.md`

## Requirements

- Codex with local plugin support.
- Claude Code CLI installed and available as `claude`.
- Antigravity CLI installed and available as `agy` only when Antigravity reviews are requested.
- Git submodules initialized for local helper-script use.

## Clone

Clone this profile with submodules:

```powershell
git clone --recurse-submodules https://github.com/dydtjr1128/codex-external-review-profile.git
cd codex-external-review-profile
```

If the repository was cloned without submodules:

```powershell
git submodule update --init --recursive
```

When provider `v1.0.0` tags are intentionally moved, refresh submodule tags:

```powershell
git -C claude-bridge fetch --force --tags origin
git -C antigravity-bridge fetch --force --tags origin
```

## Plugin Structure

Codex loads the root plugin and its provider-qualified skills. The provider folders remain independent submodules for source synchronization and version pinning; Codex does not need to discover them as nested plugins.

- `skills/claude-review`, `skills/claude-adversarial-review`, and `skills/claude-rescue`
- `skills/antigravity-review`, `skills/antigravity-adversarial-review`, and `skills/antigravity-rescue`
- `scripts/` and `prompts/` contain the self-contained runtime assets used by those skills.

Add this repository to the personal marketplace, then install only the aggregate plugin:

```powershell
codex plugin add external-review-profiles@personal
```

Do not install the two provider submodules separately. Start a new Codex task after installation so the six skills are loaded.

## Router Gate Policy

Do not choose a provider from a generic review or investigation request. The user must explicitly select Claude Bridge, Antigravity Bridge, or both.

- Provider selection: every provider is an explicit opt-in.
- Model depth: `--deep` or any deeper model is an explicit opt-in.
- Additional work: retries, extra passes, and additional reviewers require a new explicit request.
- Program execution: tests, builds, package managers, scripts, servers, applications, CI, deployment, release, and workflow automation require a separate explicit user request; review or investigation alone is not permission.
- Static inspection: read-only repository commands needed to obtain the requested scope are allowed, including `git diff`, `git status`, `git show`, `git log`, `git blame`, and `git ls-files`; they must not modify repository state.

Give Claude Bridge one attempt bounded to ten minutes (`10m0s`), fifteen minutes (`15m0s`) when the selected model name contains `opus`, or twenty minutes (`20m0s`) when it contains `fable`. Give Antigravity Bridge one attempt bounded to five minutes (`5m0s`). An explicit timeout always overrides the model default. If time or evidence is insufficient, return the supported findings and state the remaining gap without retrying, adding a reviewer, expanding scope, or switching to a deeper model.

Keep the pass focused: start with the exact diff or named files, inspect only directly relevant dependencies needed to support a concrete finding, and report uncertainty instead of performing repository-wide discovery, recursively following references, or pursuing speculative context.

If a wrapper script is added later, it should follow this contract:

```powershell
node .\scripts\external-review-router.mjs review --provider claude --scope "all current uncommitted changes, including staged, unstaged, and untracked files"
node .\scripts\external-review-router.mjs review --providers claude,antigravity --scope "small auth diff"
node .\scripts\external-review-router.mjs adversarial-review --provider antigravity --scope "one risky file"
```

The first command should run Claude only because Claude is explicitly selected. Antigravity should run only when selected by `--provider antigravity`, `--providers claude,antigravity`, or `--all`. No command should add `--deep`, retry, or start another pass unless the user explicitly requests it.

## Local Helper Use

Run the integrated Claude Bridge helper only when Claude Bridge is explicitly requested:

```powershell
node .\scripts\claude-bridge.mjs review --scope "all current uncommitted changes, including staged, unstaged, and untracked files"
node .\scripts\claude-bridge.mjs adversarial-review --scope "all current uncommitted changes, including staged, unstaged, and untracked files"
```

Run the integrated Antigravity Bridge helper only when requested:

```powershell
node .\scripts\antigravity-bridge.mjs review --scope "small targeted diff"
node .\scripts\antigravity-bridge.mjs adversarial-review --scope "one high-risk file"
```

Setup diagnostics are executable validation. Run a setup command only when the user separately and explicitly requests that validation:

```powershell
node .\scripts\claude-bridge.mjs setup --json
node .\scripts\antigravity-bridge.mjs setup --json
```

Both helpers capture prompts, logs, raw output, and normalized results under their `.codex/` output directories.

Claude Bridge runs Claude Code with `--safe-mode` and explicit MCP, slash-command, and Chrome exclusions. It preserves normal authentication while preventing project customizations from inflating review startup or context. Built-in tools are limited to `Read`, `Glob`, `Grep`, and `Bash`, and `dontAsk` permission mode makes unavailable operations fail instead of pausing for approval. Organization-managed policy may still apply.

When Opus is explicitly selected, `--model opus`, Opus 5 shorthand, and `--deep` resolve to `claude-opus-5`. Pin the legacy model explicitly with `--model claude-opus-4-8` or an `opus4.8` shorthand.

## Review Handling

Treat every provider result as advisory.

- Keep review runs read-only.
- Verify file and line claims locally before reporting them as true.
- Patch only verified issues when the user asks for fixes.
- Report skipped providers as skipped, not as completed reviews.

## Repository Layout

```text
.codex-plugin/
  plugin.json
skills/
  claude-review/
  claude-adversarial-review/
  claude-rescue/
  antigravity-review/
  antigravity-adversarial-review/
  antigravity-rescue/
scripts/
prompts/
claude-bridge/
  .codex-plugin/
antigravity-bridge/
  .codex-plugin/
AGENTS.md
CLAUDE.md
README.md
```

## License

Licensed under the Apache License, Version 2.0. See `LICENSE` for the full terms.

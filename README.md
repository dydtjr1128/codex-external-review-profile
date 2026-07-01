# External Review Profiles

Pin Claude Bridge and Antigravity Bridge together as external review providers for Codex.

This repository is a parent/profile repository. It keeps the provider repositories available at known `v1.0.0` commits and documents a conservative router/gate policy for using them.

## What This Is

- A version-pinned profile for Claude Bridge and Antigravity Bridge.
- A local source checkout that can run provider helper scripts from submodules.
- A documentation layer for default provider choice and token-aware review routing.

## What This Is Not

- It is not an auto-installer for nested plugins.
- It is not a root orchestrator skill package.
- It is not a replacement for installing Claude Bridge or Antigravity Bridge directly.

## Providers

- Claude Bridge is the default provider for ordinary review, broad second-pass review, and routine rescue planning.
- Antigravity Bridge is opt-in because its usable token budget is small.
- Run both providers only when explicitly requested or when a small high-risk scope justifies the extra pass.

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

The provider folders are independent plugins embedded as submodules for version pinning.

- `claude-bridge/.codex-plugin/plugin.json` belongs to Claude Bridge.
- `antigravity-bridge/.codex-plugin/plugin.json` belongs to Antigravity Bridge.
- Installing this parent profile does not automatically install those nested provider plugins.

Install provider plugins directly when you want Codex skills such as `$review`, `$adversarial-review`, and `$rescue`:

```powershell
mkdir $HOME\plugins -Force
git clone https://github.com/dydtjr1128/claude-bridge.git $HOME\plugins\claude-bridge
git clone https://github.com/dydtjr1128/antigravity-bridge.git $HOME\plugins\antigravity-bridge
```

Add each provider to your personal Codex marketplace as described in that provider's README, then install:

```powershell
codex plugin add claude-bridge@personal
codex plugin add antigravity-bridge@personal
```

Start a new Codex thread after installation so provider skills are loaded.

## Router Gate Policy

Use Claude Bridge unless the request explicitly asks for Antigravity or all providers.

- Default review: Claude Bridge only.
- Antigravity review: explicit opt-in only.
- Dual review: explicit `--all` or `--providers claude,antigravity` intent only.
- Scope discipline: keep Antigravity scopes small and concrete.

If a wrapper script is added later, it should follow this contract:

```powershell
node .\scripts\external-review-router.mjs review --scope "current git diff"
node .\scripts\external-review-router.mjs review --providers claude,antigravity --scope "small auth diff"
node .\scripts\external-review-router.mjs adversarial-review --provider antigravity --scope "one risky file"
```

The first command should run Claude only. Antigravity should run only when selected by `--provider antigravity`, `--providers claude,antigravity`, or `--all`.

## Local Helper Use

Run Claude Bridge from this checkout:

```powershell
node .\claude-bridge\scripts\claude-bridge.mjs setup --json
node .\claude-bridge\scripts\claude-bridge.mjs review --scope "current git diff in this repository"
node .\claude-bridge\scripts\claude-bridge.mjs adversarial-review --scope "current git diff in this repository"
```

Run Antigravity Bridge only when requested:

```powershell
node .\antigravity-bridge\scripts\antigravity-bridge.mjs setup --json
node .\antigravity-bridge\scripts\antigravity-bridge.mjs review --scope "small targeted diff"
node .\antigravity-bridge\scripts\antigravity-bridge.mjs adversarial-review --scope "one high-risk file"
```

Both helpers capture prompts, logs, raw output, and normalized results under their `.codex/` output directories.

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
claude-bridge/
  .codex-plugin/
  scripts/
  skills/
antigravity-bridge/
  .codex-plugin/
  scripts/
  skills/
AGENTS.md
CLAUDE.md
README.md
```

# Integrated External Review Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `external-review-profiles@personal` the only installation required to load the six Claude Bridge and Antigravity Bridge review skills.

**Architecture:** The root plugin owns provider-qualified skill copies plus self-contained provider scripts and prompts. The two submodules remain pinned source inputs, but Codex loads only the root plugin and never depends on recursive nested-plugin discovery.

**Tech Stack:** Codex plugin JSON, Markdown skills and prompts, Node.js ESM helpers, Node test runner, PowerShell, Git submodules

## Global Constraints

- Keep Claude Bridge and Antigravity Bridge terminology consistent.
- Preserve explicit provider selection, one `5m0s` attempt per selected provider, and explicit opt-ins for execution, deeper models, retries, and additional passes.
- Keep `claude-bridge` and `antigravity-bridge` submodule internals unchanged and pinned to their current commits.
- Use provider-qualified root skill names to avoid collisions.
- Do not add an automatic provider router.

---

### Task 1: Root Plugin Integration Contract

**Files:**
- Create: `tests/integrated-plugin.test.mjs`
- Modify: `.codex-plugin/plugin.json`

**Interfaces:**
- Consumes: the root repository layout and Codex plugin manifest schema
- Produces: manifest field `skills: "./skills/"` and a static integration test that enumerates all required root assets

- [ ] **Step 1: Write the failing integration test**

Create `tests/integrated-plugin.test.mjs` using `node:test`, `node:assert/strict`, `node:fs`, and `node:path`. Assert that the root manifest declares `./skills/`, that these directories exist, and that each contains `SKILL.md`:

```js
const skillNames = [
  "claude-review",
  "claude-adversarial-review",
  "claude-rescue",
  "antigravity-review",
  "antigravity-adversarial-review",
  "antigravity-rescue",
];
```

Also assert that `scripts/claude-bridge.mjs`, `scripts/antigravity-bridge.mjs`, and all six files under `prompts/claude/` and `prompts/antigravity/` exist. Parse each skill frontmatter and assert its `name` equals its directory name.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/integrated-plugin.test.mjs`

Expected: FAIL because the root manifest lacks `skills` and the integrated assets do not exist.

- [ ] **Step 3: Update the root manifest**

Add this top-level field to `.codex-plugin/plugin.json`:

```json
"skills": "./skills/"
```

Replace parent/profile-only interface copy with aggregate-plugin copy that states one installation exposes both providers while preserving explicit provider selection.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/integrated-plugin.test.mjs`

Expected: FAIL only for the integrated skills, scripts, and prompts that Task 2 creates.

- [ ] **Step 5: Commit the contract**

```powershell
git add -- .codex-plugin/plugin.json tests/integrated-plugin.test.mjs
git commit -m "test: 통합 플러그인 계약 추가"
```

### Task 2: Provider-Qualified Skills and Runtime Assets

**Files:**
- Create: `skills/claude-review/SKILL.md`
- Create: `skills/claude-review/agents/openai.yaml`
- Create: `skills/claude-adversarial-review/SKILL.md`
- Create: `skills/claude-adversarial-review/agents/openai.yaml`
- Create: `skills/claude-rescue/SKILL.md`
- Create: `skills/claude-rescue/agents/openai.yaml`
- Create: `skills/antigravity-review/SKILL.md`
- Create: `skills/antigravity-review/agents/openai.yaml`
- Create: `skills/antigravity-adversarial-review/SKILL.md`
- Create: `skills/antigravity-adversarial-review/agents/openai.yaml`
- Create: `skills/antigravity-rescue/SKILL.md`
- Create: `skills/antigravity-rescue/agents/openai.yaml`
- Create: `scripts/claude-bridge.mjs`
- Create: `scripts/antigravity-bridge.mjs`
- Create: `prompts/claude/review.md`
- Create: `prompts/claude/adversarial-review.md`
- Create: `prompts/claude/rescue.md`
- Create: `prompts/antigravity/review.md`
- Create: `prompts/antigravity/adversarial-review.md`
- Create: `prompts/antigravity/rescue.md`
- Test: `tests/integrated-plugin.test.mjs`

**Interfaces:**
- Consumes: provider files from `claude-bridge/{skills,scripts,prompts}` and `antigravity-bridge/{skills,scripts,prompts}`
- Produces: six root skill names and two helpers addressable as `../../scripts/<provider>-bridge.mjs` from every installed skill

- [ ] **Step 1: Copy runtime assets from the pinned providers**

Use filesystem copies without modifying either submodule:

```powershell
Copy-Item claude-bridge\scripts\claude-bridge.mjs scripts\claude-bridge.mjs
Copy-Item antigravity-bridge\scripts\antigravity-bridge.mjs scripts\antigravity-bridge.mjs
Copy-Item claude-bridge\prompts\*.md prompts\claude\
Copy-Item antigravity-bridge\prompts\*.md prompts\antigravity\
```

Adjust only the copied helpers' prompt-directory resolution so Claude reads `prompts/claude` and Antigravity reads `prompts/antigravity` relative to the root plugin.

- [ ] **Step 2: Copy and qualify the six skills**

Copy each provider skill and its `agents/openai.yaml` to the provider-qualified root directory. Set frontmatter names exactly to the six names enumerated in Task 1 and preserve descriptions that require explicit provider invocation. Keep installed helper references as `../../scripts/claude-bridge.mjs` or `../../scripts/antigravity-bridge.mjs`.

- [ ] **Step 3: Run static and provider tests**

Run:

```powershell
node --test tests/integrated-plugin.test.mjs
node --test claude-bridge/tests/claude-bridge.test.mjs
node --test antigravity-bridge/tests/antigravity-bridge.test.mjs
```

Expected: all tests PASS; provider tests must not invoke external reviewer CLIs.

- [ ] **Step 4: Validate the root plugin and skills**

Run:

```powershell
python C:\Users\EST\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py .
Get-ChildItem skills -Directory | ForEach-Object { python C:\Users\EST\.codex\skills\.system\skill-creator\scripts\quick_validate.py $_.FullName }
```

Expected: the plugin and all six populated skills validate successfully; obsolete empty root directories are excluded or removed.

- [ ] **Step 5: Commit the integrated runtime**

```powershell
git add -- skills scripts prompts tests/integrated-plugin.test.mjs
git commit -m "feat: 외부 리뷰 공급자 스킬 통합"
```

### Task 3: Documentation, Reinstall, and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `.codex-plugin/plugin.json`
- Inspect only: `$HOME/.agents/plugins/marketplace.json`

**Interfaces:**
- Consumes: the validated aggregate plugin from Tasks 1 and 2 and marketplace name `personal`
- Produces: one enabled installation, `external-review-profiles@personal`, with separate provider installations removed

- [ ] **Step 1: Rewrite installation documentation**

Update `README.md` so it states that the root plugin loads all six provider-qualified skills, the submodules are source/version pins, and users install only:

```powershell
codex plugin add external-review-profiles@personal
```

Remove instructions claiming the root is not an auto-installer or requiring separate provider plugin installation. Document the six exact skill names and the need to start a new Codex task after installation.

- [ ] **Step 2: Run documentation and repository checks**

Run:

```powershell
rg -n "install provider plugins separately|not an auto-installer|codex plugin add (claude|antigravity)-bridge" README.md .codex-plugin
git diff --check
git submodule status
```

Expected: the obsolete installation search returns no matches, `git diff --check` succeeds, and both submodule commits are unchanged.

- [ ] **Step 3: Commit documentation**

```powershell
git add -- README.md
git commit -m "docs: 통합 플러그인 설치 방법 갱신"
```

- [ ] **Step 4: Update the cachebuster and reinstall the aggregate plugin**

Run:

```powershell
python C:\Users\EST\.codex\skills\.system\plugin-creator\scripts\update_plugin_cachebuster.py .
python C:\Users\EST\.codex\skills\.system\plugin-creator\scripts\read_marketplace_name.py
codex plugin add external-review-profiles@personal
```

Expected: the marketplace helper prints `personal` and the aggregate plugin installs successfully with the new cachebuster version.

- [ ] **Step 5: Remove duplicate provider installations**

First inspect command syntax with `codex plugin --help`, then use the supported remove command for exactly `claude-bridge@personal` and `antigravity-bridge@personal`. Do not alter their marketplace source entries unless the CLI requires it and reports that requirement.

- [ ] **Step 6: Verify the final installed state**

Run:

```powershell
codex plugin list | Select-String "external-review-profiles|claude-bridge|antigravity-bridge"
git diff --check
git status --short
```

Expected: `external-review-profiles@personal` is installed and enabled; the two provider plugins are not installed; repository checks are clean apart from the cachebuster manifest change that must be committed.

- [ ] **Step 7: Commit the cachebuster**

```powershell
git add -- .codex-plugin/plugin.json
git commit -m "chore: 통합 플러그인 캐시 갱신"
```

Start a new Codex task to confirm that the six provider-qualified skills are loaded from the aggregate plugin.

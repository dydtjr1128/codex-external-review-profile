# Bounded Read-Only External Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent unrequested program execution and open-ended review runs while keeping static review inspection available.

**Architecture:** Each provider owns the policy in its skill and prompt files and enforces the five-minute ceiling in its helper process. Provider tests import guarded helper modules and inject pure spawn-result fakes, never launch Claude or Antigravity executables, and the parent repository records the shared routing policy and updated submodule revisions.

**Tech Stack:** Markdown skills/prompts, Node.js ESM, `node:test`, Git submodules.

## Global Constraints

- A review request authorizes exactly one requested provider invocation.
- Tests, builds, package managers, scripts, servers, applications, CI, deployment, release, and workflow automation require a separate explicit request.
- Static file and diff inspection remains available without a special shell-read allowance.
- The default hard timeout is `5m0s`; timeout, empty output, and provider failure are incomplete runs.
- Automatic retry, additional reviewers, scope expansion, and deep-model escalation are prohibited.
- Tests must not call real external review providers.

---

### Task 1: Claude Bridge policy and hard timeout

**Files:**
- Create: `claude-bridge/tests/claude-bridge.test.mjs`
- Modify: `claude-bridge/scripts/claude-bridge.mjs`
- Modify: `claude-bridge/prompts/review.md`
- Modify: `claude-bridge/prompts/adversarial-review.md`
- Modify: `claude-bridge/prompts/rescue.md`
- Modify: `claude-bridge/skills/review/SKILL.md`
- Modify: `claude-bridge/skills/adversarial-review/SKILL.md`
- Modify: `claude-bridge/skills/rescue/SKILL.md`
- Modify: `claude-bridge/README.md`

**Interfaces:**
- Consumes: existing `review`, `adversarial-review`, and `rescue` helper commands.
- Produces: `--timeout <duration>` with default `5m0s`, import-safe `parseDuration(value)`, `run(command, args, options)`, and `commandReport(result)` exports, and result metadata containing `timeout` and `timedOut`.

- [ ] **Step 1: Write failing helper and policy tests**

Create an import-based `node:test` harness. Guard the helper entry point with `import.meta.url` so imports do not call `main()`. Inject a pure `spawn` function into `run()` and return plain success, status-7 failure, and `ETIMEDOUT` result objects. No test may launch a child process or resolve an external provider executable.

Add assertions equivalent to:

```js
assert.equal(parseDuration("5m0s"), 300_000);
assert.equal(capturedSpawnOptions.timeout, 50);
assert.equal(commandReport(successResult).timedOut, false);
assert.equal(commandReport(failureResult).status, 7);
assert.equal(commandReport(timeoutResult).timedOut, true);

for (const file of promptFiles) {
  const text = readFileSync(file, "utf8");
  assert.match(text, /Do not execute programs unless the user explicitly and directly requests that execution\./);
  assert.match(text, /Complete one bounded pass within five minutes\./);
  assert.match(text, /Do not retry, add reviewers, or switch to a deeper model automatically\./);
  assert.doesNotMatch(text, /lightweight local commands/i);
}
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/claude-bridge.test.mjs`

Expected: FAIL because the import-safe exports and `--timeout` are not implemented and current prompt text permits lightweight local commands and automatic deep selection. No external executable starts during RED.

- [ ] **Step 3: Implement Claude process timeout**

Add duration parsing for `ms`, `s`, `m`, and combined values such as `5m0s`, rejecting zero, negative, or malformed inputs. Pass the parsed milliseconds to `spawnSync`:

```js
function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: process.env,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
    timeout: options.timeoutMs
  });
}
```

Use `options.timeout ?? "5m0s"` for review-oriented commands. Mark `timedOut` when `claude.error?.code === "ETIMEDOUT"`, keep any partial output, return failure, and never retry.

- [ ] **Step 4: Tighten Claude skills and prompts**

Replace the current workflow-only restriction and lightweight-command allowance with this contract in all three prompt modes:

```text
Do not execute programs unless the user explicitly and directly requests that execution. This includes tests, builds, package managers, scripts, servers, applications, CI, deployment, release, and workflow automation. A review or investigation request alone is not permission to execute them.
Complete one bounded pass within five minutes.
Do not retry, add reviewers, expand the scope, or switch to a deeper model automatically.
If the available time or evidence is insufficient, return the supported findings and state the remaining gap.
```

Remove automatic print-mode smoke tests from review preflight. Keep `setup` documented as an explicit diagnostic command. Require explicit user intent for Opus, `--deep`, retries, executable validation, and fixes. Limit local verification to static file and line inspection.

- [ ] **Step 5: Run Claude tests and verify GREEN**

Run: `node --test tests/claude-bridge.test.mjs`

Expected: PASS with success, provider failure, timeout, and all policy assertions covered without a real Claude invocation.

- [ ] **Step 6: Commit Claude Bridge changes**

```powershell
git add README.md prompts scripts skills tests
git commit -m "fix: 리뷰 실행과 시간 제한 강화"
```

### Task 2: Antigravity Bridge policy and hard timeout

**Files:**
- Create: `antigravity-bridge/tests/antigravity-bridge.test.mjs`
- Modify: `antigravity-bridge/scripts/antigravity-bridge.mjs`
- Modify: `antigravity-bridge/prompts/review.md`
- Modify: `antigravity-bridge/prompts/adversarial-review.md`
- Modify: `antigravity-bridge/prompts/rescue.md`
- Modify: `antigravity-bridge/skills/review/SKILL.md`
- Modify: `antigravity-bridge/skills/adversarial-review/SKILL.md`
- Modify: `antigravity-bridge/skills/rescue/SKILL.md`
- Modify: `antigravity-bridge/README.md`

**Interfaces:**
- Consumes: existing `--print-timeout <duration>` and the `agy` transcript fallback.
- Produces: a process-level timeout derived from `--print-timeout`, result metadata containing `timeout` and `timedOut`, and immediate stdout use before transcript polling.

- [ ] **Step 1: Write failing helper and policy tests**

Create the same import-safe, dependency-injected unit harness as Task 1. Inject plain success, status-7 failure, and `ETIMEDOUT` results into the helper's spawn boundary. No test may launch a child process or resolve `agy`.

Use the same prompt-policy assertions as Task 1 and additionally inject a transcript lookup spy to assert that non-empty stdout does not trigger transcript polling.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test tests/antigravity-bridge.test.mjs`

Expected: FAIL because `spawnSync` has no hard timeout, stdout still triggers transcript polling, and the prompts retain the permissive wording.

- [ ] **Step 3: Enforce the Antigravity process ceiling**

Parse the existing `--print-timeout` value and pass it to `spawnSync` as `timeout`. When stdout is non-empty, use it immediately; only poll transcript files when stdout is empty and the provider did not fail or time out.

Expose `timeout` and `timedOut` in metadata, preserve partial stdout, fail timed-out runs, and do not retry.

- [ ] **Step 4: Tighten Antigravity skills and prompts**

Apply the exact contract from Task 1. Remove automatic setup smoke tests from review preflight, require explicit user intent for `--deep`, retries, executable validation, fixes, and additional providers, and retain only static local verification by default.

- [ ] **Step 5: Run Antigravity tests and verify GREEN**

Run: `node --test tests/antigravity-bridge.test.mjs`

Expected: PASS with success, provider failure, timeout, no unnecessary transcript wait, and all policy assertions covered without a real Antigravity invocation.

- [ ] **Step 6: Commit Antigravity Bridge changes**

```powershell
git add README.md prompts scripts skills tests
git commit -m "fix: 리뷰 실행과 시간 제한 강화"
```

### Task 3: Parent profile routing and pinned revisions

**Files:**
- Modify: `.codex-plugin/plugin.json`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `claude-bridge` gitlink
- Modify: `antigravity-bridge` gitlink

**Interfaces:**
- Consumes: the committed provider revisions from Tasks 1 and 2.
- Produces: one shared parent policy stating explicit provider selection, no automatic extra reviewers or deep mode, and a five-minute single-attempt review boundary.

- [ ] **Step 1: Write a failing parent policy check**

Run targeted searches before editing:

```powershell
rg -n "small high-risk scope justifies|lightweight local commands|keep polling|genuinely long wait" README.md .codex-plugin AGENTS.md CLAUDE.md
```

Expected: at least the automatic high-risk provider-escalation wording is present.

- [ ] **Step 2: Update parent policy documentation**

State that providers, deep mode, retries, and extra passes are explicit opt-ins only. Add the five-minute, one-attempt rule and the separate-request requirement for program execution. Remove wording that lets high-risk scope silently add Antigravity or other reviewers.

- [ ] **Step 3: Verify provider and parent policy consistency**

Run:

```powershell
node --test .\claude-bridge\tests\claude-bridge.test.mjs
node --test .\antigravity-bridge\tests\antigravity-bridge.test.mjs
rg -n "lightweight local commands|small high-risk scope justifies|keep polling|genuinely long wait" README.md .codex-plugin AGENTS.md CLAUDE.md claude-bridge antigravity-bridge
git diff --check
```

Expected: both test suites PASS, prohibited legacy wording has no matches in active policy files, and `git diff --check` is clean.

- [ ] **Step 4: Commit parent revisions**

```powershell
git add .codex-plugin/plugin.json README.md AGENTS.md CLAUDE.md claude-bridge antigravity-bridge
git commit -m "fix: 외부 리뷰 실행 정책 제한"
```

### Task 4: Final regression and handoff

**Files:**
- Verify only: all files changed in Tasks 1-3.

**Interfaces:**
- Consumes: clean provider tests and committed submodule revisions.
- Produces: a reproducible verification record and an explicit note that installed plugin caches require reinstall or update outside this source change.

- [ ] **Step 1: Run final verification**

```powershell
node --test .\claude-bridge\tests\claude-bridge.test.mjs
node --test .\antigravity-bridge\tests\antigravity-bridge.test.mjs
git -C claude-bridge diff --check
git -C antigravity-bridge diff --check
git diff --check
git status --short
git -C claude-bridge status --short --branch
git -C antigravity-bridge status --short --branch
```

Expected: both test suites PASS; all diff checks are clean; only intentional commits and gitlink changes remain.

- [ ] **Step 2: Report installation boundary**

Report that source and pinned provider revisions are complete, but cached installed plugins do not update automatically. Do not reinstall plugins, move release tags, push branches, or mutate user-global caches without a separate explicit request.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as claude from "../scripts/claude-bridge.mjs";
import * as antigravity from "../scripts/antigravity-bridge.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const invoke = (provider, ...args) => spawnSync(process.execPath, [
  path.join(root, "scripts", `${provider}-bridge.mjs`), ...args,
], { encoding: "utf8", timeout: 10000 });

test("bundled Claude aliases select current models and retain explicit pins", () => {
  for (const [alias, expected] of [
    ["opus", "claude-opus-5-5"], ["opus5.5", "claude-opus-5-5"],
    ["fable", "claude-fable-5-1"], ["fable 5.1", "claude-fable-5-1"],
    ["opus5", "claude-opus-5"], ["fable5", "claude-fable-5"],
    ["opus4.8", "claude-opus-4-8"], ["custom-model", "custom-model"],
  ]) {
    assert.equal(claude.normalizeModel(alias, "review", false), expected);
  }
  assert.equal(claude.normalizeModel(undefined, "rescue", true), "claude-opus-5-5");
  assert.equal(claude.defaultTimeoutForModel("claude-opus-5-5"), "15m0s");
  assert.equal(claude.defaultTimeoutForModel("claude-fable-5-1"), "20m0s");
});

test("bundled Antigravity uses current Flash defaults without inventing Claude labels", () => {
  assert.equal(antigravity.normalizeModel(undefined, "review", false), "Gemini 3.8 Flash (Medium)");
  assert.equal(antigravity.normalizeModel(undefined, "adversarial-review", false), "Gemini 3.8 Flash (High)");
  assert.equal(antigravity.normalizeModel("gemini-3.5-flash-medium", "review", false), "Gemini 3.5 Flash (Medium)");
  assert.equal(antigravity.normalizeModel("opus", "review", false), "Claude Opus 4.6 (Thinking)");
});

test("bundled Antigravity never accepts an unrelated transcript for empty stdout", () => {
  const result = antigravity.commandReport({ status: 0, stdout: "", stderr: "" }, {
    transcriptLookup: () => assert.fail("Must not consult global transcripts"),
  });
  assert.equal(result.success, false);
  assert.equal(result.result, "");
  assert.equal(result.transcriptPath, null);
  assert.equal(result.conversationId, null);
});

test("bundled Claude edit permissions require rescue opt-in", () => {
  const read = claude.buildClaudeArgs("investigate");
  assert.equal(read.includes("--allowedTools"), false);
  assert.equal(read[read.indexOf("--tools") + 1], "Read,Glob,Grep,Bash");
  const edit = claude.buildClaudeArgs("fix", { allowEdits: true });
  assert.equal(edit[edit.indexOf("--tools") + 1], "Read,Glob,Grep,Bash,Edit,Write");
  assert.equal(edit[edit.indexOf("--allowedTools") + 1], "Edit,Write");
  for (const command of ["review", "adversarial-review", "setup"]) {
    assert.throws(() => claude.validateCommandOptions(command, { "allow-edits": true }));
  }
  claude.validateCommandOptions("rescue", { "allow-edits": true });
});

for (const [provider, bridge, timeoutKey] of [
  ["claude", claude, "timeout"], ["antigravity", antigravity, "print-timeout"],
]) {
  test(`${provider} setup shares a deadline and skips smoke after failure`, () => {
    for (const mode of ["success", "failed-version", "expired-version", "failed-smoke"]) {
      let now = 0;
      let calls = 0;
      let smokeCalls = 0;
      const result = bridge.runSetupCheck({ [timeoutKey]: "100ms" }, {
        now: () => now,
        run: (_command, args, options) => {
          calls++;
          if (args[0] === "--version") {
            assert.equal(options.timeoutMs, 100);
            now += mode === "expired-version" ? 100 : 30;
            return { status: mode === "failed-version" ? 1 : 0, stdout: "version", stderr: "" };
          }
          smokeCalls++;
          assert.equal(options.timeoutMs, 70);
          return { status: mode === "failed-smoke" ? 1 : 0, stdout: "OK", stderr: "" };
        },
        runPrompt: (options) => {
          smokeCalls++;
          assert.equal(options.timeout, "70ms");
          return { success: mode !== "failed-smoke" };
        },
      });
      assert.equal(result.ready, mode === "success", mode);
      const skipped = mode === "failed-version" || mode === "expired-version";
      assert.equal(smokeCalls, skipped ? 0 : 1, mode);
      if (skipped) {
        assert.equal(calls, 1);
        assert.equal(result.smoke.skipped, true);
      }
    }
  });

  test(`${provider} CLI rejects bad options and timeout values before dry-run`, () => {
    for (const args of [
      ["--unknown", "value"], [`--${timeoutKey}`, "invalid"],
      ["--model", "custom", "--deep"],
    ]) {
      const result = invoke(provider, "review", "--dry-run", ...args);
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, /Unknown option|Invalid timeout|either/);
    }
  });
}

test("bundled rescue prompt reflects explicit edit authorization", () => {
  for (const allowEdits of [false, true]) {
    const result = invoke("claude", "rescue", "--dry-run", "--json", "--model", "fable",
      ...(allowEdits ? ["--allow-edits"] : []));
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.model, "claude-fable-5-1");
    assert.equal(payload.timeout, "20m0s");
    assert.doesNotMatch(payload.prompt, /\{\{[A-Z_]+\}\}/);
    assert.match(payload.prompt, allowEdits ? /Use Edit and Write only within/ : /Do not edit files\. This run is investigation/);
  }
});

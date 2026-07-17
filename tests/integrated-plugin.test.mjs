import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillNames = [
  "claude-review",
  "claude-adversarial-review",
  "claude-rescue",
  "antigravity-review",
  "antigravity-adversarial-review",
  "antigravity-rescue",
];

const runtimeFiles = [
  "scripts/claude-bridge.mjs",
  "scripts/antigravity-bridge.mjs",
  "prompts/claude/review.md",
  "prompts/claude/adversarial-review.md",
  "prompts/claude/rescue.md",
  "prompts/antigravity/review.md",
  "prompts/antigravity/adversarial-review.md",
  "prompts/antigravity/rescue.md",
];

function frontmatterName(markdown) {
  const match = markdown.match(/^---\r?\n[\s\S]*?^name:\s*([^\r\n]+)$/m);
  return match?.[1]?.trim();
}

test("root manifest exposes the integrated skills directory", () => {
  const manifest = JSON.parse(
    readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"),
  );
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.version, "1.0.1");
});

test("all provider-qualified skills have matching frontmatter names", () => {
  for (const skillName of skillNames) {
    const skillPath = path.join(root, "skills", skillName, "SKILL.md");
    assert.ok(existsSync(skillPath), `missing ${skillPath}`);
    assert.equal(frontmatterName(readFileSync(skillPath, "utf8")), skillName);
  }
});

test("the aggregate plugin contains every provider runtime asset", () => {
  for (const relativePath of runtimeFiles) {
    assert.ok(existsSync(path.join(root, relativePath)), `missing ${relativePath}`);
  }
});

test("all review policies allow scoped read-only repository inspection without state changes", () => {
  const policyFiles = [
    ...skillNames.map((name) => `skills/${name}/SKILL.md`),
    ...runtimeFiles.filter((relativePath) => relativePath.startsWith("prompts/")),
  ];

  for (const relativePath of policyFiles) {
    const content = readFileSync(path.join(root, relativePath), "utf8");
    assert.match(content, /Read-only repository inspection commands required to obtain the requested scope are allowed/);
    assert.match(content, /git diff/);
    assert.match(content, /do not run commands that modify files, the index, refs, configuration, or other repository state/);
    assert.doesNotMatch(content, /Do not execute programs unless the user explicitly and directly requests that execution/);
  }
});

test("Claude review timeouts scale for slower models without changing Antigravity", async () => {
  const bridgePath = path.join(root, "scripts", "claude-bridge.mjs");
  const bridge = await import(`${pathToFileURL(bridgePath).href}?timeout-policy`);

  assert.equal(bridge.CLAUDE_DEFAULT_TIMEOUT, "10m0s");
  assert.equal(bridge.defaultTimeoutForModel("claude-sonnet-5"), "10m0s");
  assert.equal(bridge.defaultTimeoutForModel("claude-opus-4-8"), "15m0s");
  assert.equal(bridge.defaultTimeoutForModel("team-fable-reviewer"), "20m0s");

  for (const relativePath of [
    "skills/claude-review/SKILL.md",
    "skills/claude-adversarial-review/SKILL.md",
    "skills/claude-rescue/SKILL.md",
    "prompts/claude/review.md",
    "prompts/claude/adversarial-review.md",
    "prompts/claude/rescue.md",
  ]) {
    const content = readFileSync(path.join(root, relativePath), "utf8");
    assert.match(content, /ten minutes|10m0s|\{\{TIMEOUT\}\}/i, relativePath);
    assert.doesNotMatch(content, /within five minutes|default is `5m0s`|`5m0s` default/i, relativePath);
  }

  const antigravity = readFileSync(
    path.join(root, "scripts", "antigravity-bridge.mjs"),
    "utf8",
  );
  assert.match(antigravity, /5m0s/);
});

test("Claude runs reviews with isolated read-only-oriented parameters", async () => {
  const bridgePath = path.join(root, "scripts", "claude-bridge.mjs");
  const bridge = await import(`${pathToFileURL(bridgePath).href}?isolated-mode`);

  assert.equal(bridge.CLAUDE_SETUP_TIMEOUT, "2m0s");
  assert.equal(bridge.CLAUDE_REVIEW_TOOLS, "Read,Glob,Grep,Bash");
  assert.deepEqual(bridge.buildClaudeArgs("review this diff", {
    model: "claude-sonnet-5",
    outputFormat: "json",
  }), [
    "--safe-mode",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--no-chrome",
    "--tools",
    "Read,Glob,Grep,Bash",
    "--permission-mode",
    "dontAsk",
    "-p",
    "review this diff",
    "--model",
    "claude-sonnet-5",
    "--output-format",
    "json",
    "--no-session-persistence",
  ]);
});

test("Claude helper rejects ambiguous and unsupported parameters", async () => {
  const bridgePath = path.join(root, "scripts", "claude-bridge.mjs");
  const bridge = await import(`${pathToFileURL(bridgePath).href}?parameter-validation`);

  assert.throws(() => bridge.parseArgs(["--timout", "1m0s"]), /Unknown option/);
  assert.throws(
    () => bridge.validateCommandOptions("setup", { model: "sonnet" }),
    /not valid for setup/,
  );
  assert.throws(
    () => bridge.validateCommandOptions("review", { deep: true, model: "opus" }),
    /either --deep or --model/,
  );
  assert.deepEqual(
    bridge.parseArgs(["--scope", "current diff", "--", "--flag", "behavior"]),
    {
      options: { scope: "current diff" },
      positionals: ["--flag", "behavior"],
    },
  );
});

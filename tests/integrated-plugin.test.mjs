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
  assert.match(manifest.version, /^1\.0\.0(?:\+codex\.[0-9]+)?$/);
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

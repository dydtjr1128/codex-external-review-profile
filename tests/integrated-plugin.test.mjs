import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

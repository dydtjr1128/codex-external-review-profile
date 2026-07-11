# Integrated External Review Plugin Design

## Goal

Make `external-review-profiles` the only plugin users need to install for Claude Bridge and Antigravity Bridge review workflows. Installing the parent plugin must expose all six provider-specific skills without relying on recursive loading of nested plugins.

## Architecture

The parent repository remains the release and version-pinning boundary. Its root plugin becomes a functional aggregate containing provider-specific skills, helper scripts, and prompts. The `claude-bridge` and `antigravity-bridge` submodules remain pinned source repositories, but Codex does not install or load them as nested plugins.

Skill names are provider-qualified to prevent collisions:

- `claude-review`, `claude-adversarial-review`, and `claude-rescue`
- `antigravity-review`, `antigravity-adversarial-review`, and `antigravity-rescue`

Each integrated skill resolves its helper relative to the root plugin. Provider scripts and prompts are copied into provider-specific root paths so an installed plugin cache is self-contained and does not depend on submodule plugin discovery.

## Manifest and Documentation

The root `.codex-plugin/plugin.json` declares the root `skills/` directory and describes the aggregate capabilities. The README explains that users install only `external-review-profiles`, while the submodules are retained for source synchronization and version pinning.

The provider-selection policy remains unchanged: Claude Bridge, Antigravity Bridge, or both run only when explicitly selected. Each selected provider receives one attempt bounded to five minutes. Program execution, deeper models, retries, and additional passes remain explicit opt-ins.

## Installation Migration

The personal marketplace continues to point `external-review-profiles` at this repository. After validation, the root plugin receives a cachebuster update and is reinstalled from the personal marketplace. The separately installed `claude-bridge` and `antigravity-bridge` plugins are removed to prevent duplicate or ambiguous skill loading.

A new Codex task is required after reinstall so the application loads the updated plugin inventory.

## Validation

Static validation must confirm:

- The root manifest is valid and declares the integrated skills directory.
- All six skills have valid metadata, unique provider-qualified names, and resolvable helper paths.
- The root plugin contains every script and prompt required at runtime.
- Documentation no longer instructs users to install nested providers separately.

Existing provider tests may be adapted or supplemented to validate the integrated paths. Executable tests and plugin installation commands are authorized by the user's explicit request to rebuild and reinstall the plugin.

## Scope Boundaries

This change does not alter provider CLI behavior, model-selection rules, review prompts, or the pinned submodule implementations except where path adaptation is required for integration. It does not add an automatic router or infer provider selection.

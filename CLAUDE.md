# Repository Instructions

## Language And Formatting

- Write project docs, commit subjects, commit bodies, and release notes in English.
- Keep bullet lists compact: use one to four bullets per list and do not put blank lines between bullet items.
- Keep README and provider terminology consistent with Claude Bridge and Antigravity Bridge.

## Git And Release

- Use concise English commit subjects.
- Use commit bodies only when useful; if used, keep bullet lines adjacent with no blank lines between them.
- Before pushing, verify `git diff --check` and inspect commit messages for non-ASCII text and repeated blank lines.
- For release tags, create or move `v1.0.0` at the current release commit and push the tag when requested.

## Submodules

- Keep `claude-bridge` and `antigravity-bridge` pinned to their current `v1.0.0` tag commits when cutting this profile release.
- Fetch submodule tags with `--force` when those release tags were intentionally moved.
- Do not edit submodule internals from this parent repository unless the user explicitly asks for submodule changes.

## External Review Policy

- Run a provider only when the user explicitly selects Claude Bridge, Antigravity Bridge, or both; never infer provider selection from risk, scope, or an incomplete result.
- Give Claude Bridge one attempt bounded to ten minutes (`10m0s`), fifteen minutes (`15m0s`) when the selected model name contains `opus`, or twenty minutes (`20m0s`) when it contains `fable`. Give Antigravity Bridge one attempt bounded to five minutes (`5m0s`). If time or evidence is insufficient, return supported findings and the remaining gap.
- Deep mode, deeper models, retries, extra passes, and additional reviewers or providers are explicit opt-ins only and must never be added automatically.
- Program execution requires a separate explicit user request; a review or investigation request alone does not authorize tests, builds, package managers, scripts, servers, applications, CI, deployment, release, or workflow automation.
- Keep inspection narrow: start with the exact diff or named files, inspect only directly relevant dependencies for a concrete finding, and report uncertainty instead of broadening scope or recursively following references.

## Web Access

- If browser or web search tools hit certificate errors, first try a CLI fallback such as `curl-cffi get https://www.naver.com`.
- If a required URL still times out after that fallback, treat a corporate Wi-Fi firewall as a possible cause and report only that possibility.

## Worktree Safety

- Do not stage unrelated local changes; commit only the requested files.
- Preserve user edits in the worktree unless explicitly asked to change them.

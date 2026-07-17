# Bounded Read-Only External Reviews

## Goal

Make review-oriented provider runs predictable: a review request authorizes one external reviewer invocation, but it does not authorize unrelated program execution or an open-ended deep investigation.

## Behavioral Contract

- Without a separate explicit request, reviewers must not run tests, builds, package managers, scripts, servers, applications, CI, deployment, release, or workflow automation.
- Static inspection needed to read the requested diff and files remains available. Review prompts explicitly allow only the read-only repository commands needed to obtain that scope, such as `git diff`, `git status`, `git show`, `git log`, `git blame`, and `git ls-files`, and prohibit commands that modify repository state.
- Ordinary and adversarial reviews get one attempt with a five-minute hard timeout. Timeout, empty output, or provider failure is reported as incomplete rather than retried automatically.
- Deep models, expanded scope, additional reviewers, and retries require explicit user intent. High-risk scope may be reported as residual risk but does not silently enable deep mode.

## Components

### Provider skills

Update the Claude Bridge and Antigravity Bridge review-oriented skills so their preflight does not run a separate smoke prompt by default. The requested review invocation itself is the readiness check. Keep setup diagnostics available only when the user explicitly asks for setup or troubleshooting.

The skills must distinguish static verification from project or validation execution. Findings may be checked against files, line references, and read-only repository commands, but tests or project programs are not run unless separately requested.

### Provider prompts

Apply the same execution prohibition and bounded-pass contract to ordinary review, adversarial review, and investigation-only rescue prompts. Rescue may execute or edit only when the user explicitly requests the corresponding action.

### Helper processes

Enforce a five-minute default at the process boundary so prompt compliance is not the only control. Claude Bridge needs a helper timeout; Antigravity Bridge keeps its existing five-minute print timeout. Both helpers must surface timeouts as failed, incomplete runs and must not retry or switch models automatically.

## Flow

1. Confirm that the requested provider executable is discoverable without a separate model smoke prompt.
2. Invoke the requested review once with the exact user scope and the bounded read-only prompt.
3. Stop after a valid result, provider failure, or five-minute timeout.
4. Reconcile claims through static inspection only and report unverified test suggestions as residual gaps.
5. Run tests, builds, scripts, fixes, retries, or deeper passes only after a separate explicit request.

## Failure Handling

- Missing provider: report the provider as unavailable without running setup diagnostics automatically.
- Timeout: terminate the helper process, label the review incomplete, and do not count it as completed.
- Partial or empty result: preserve usable partial findings when available, state the limitation, and do not retry automatically.
- Unsupported claim: discard it or label it unverified; do not execute a program merely to validate it.

## Verification

- Add prompt-policy checks for the project-execution prohibition, the read-only repository inspection allowance and state-mutation prohibition, the bounded pass, no automatic retry, and no automatic deep escalation.
- Add helper tests that simulate timeout, success, and provider failure without invoking real external reviewers.
- Run static checks against all review-oriented skill and prompt variants to prevent Claude and Antigravity policy drift.

## Scope

This change affects review, adversarial review, and non-fix rescue behavior in Claude Bridge and Antigravity Bridge, plus the parent profile documentation and pinned submodule revisions. It does not change release tags or install/update external plugin caches automatically.

## Focused Inspection Addendum

The five-minute process timeout must be paired with an explicit inspection budget so a reviewer does not spend most of the pass on broad repository discovery.

- Start from the exact diff or named files in the supplied scope.
- Inspect only directly relevant dependencies needed to support a concrete finding.
- Do not perform repository-wide discovery, recursively follow references, or pursue speculative context.
- Once a finding has enough static evidence, report it. If evidence remains insufficient, state the uncertainty and remaining gap instead of continuing to investigate.

Apply this contract consistently to review, adversarial review, and non-fix rescue prompts and skills for both providers. Keep the five-minute hard timeout unchanged; the new wording governs how the existing time budget is spent.

After the source changes are committed and pushed, remove the installed profile and provider plugins from the personal marketplace installation state. Register the current parent checkout and both current provider submodule checkouts in the personal marketplace, reinstall all three plugins, and verify their installed paths and versions. A new Codex task is still required before newly installed skills appear in active thread context.

# Bounded Read-Only External Reviews

## Goal

Make review-oriented provider runs predictable: a review request authorizes one external reviewer invocation, but it does not authorize unrelated program execution or an open-ended deep investigation.

## Behavioral Contract

- Without a separate explicit request, reviewers must not run tests, builds, package managers, scripts, servers, applications, CI, deployment, release, or workflow automation.
- Static inspection needed to read the requested diff and files remains available. Review prompts do not need an explicit shell-read allowance.
- Ordinary and adversarial reviews get one attempt with a five-minute hard timeout. Timeout, empty output, or provider failure is reported as incomplete rather than retried automatically.
- Deep models, expanded scope, additional reviewers, and retries require explicit user intent. High-risk scope may be reported as residual risk but does not silently enable deep mode.

## Components

### Provider skills

Update the Claude Bridge and Antigravity Bridge review-oriented skills so their preflight does not run a separate smoke prompt by default. The requested review invocation itself is the readiness check. Keep setup diagnostics available only when the user explicitly asks for setup or troubleshooting.

The skills must distinguish static verification from execution. Findings may be checked against files and line references, but tests or other programs are not run unless separately requested.

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

- Add prompt-policy checks for the program-execution prohibition, five-minute bounded pass, no automatic retry, and no automatic deep escalation.
- Add helper tests that simulate timeout, success, and provider failure without invoking real external reviewers.
- Run static checks against all review-oriented skill and prompt variants to prevent Claude and Antigravity policy drift.

## Scope

This change affects review, adversarial review, and non-fix rescue behavior in Claude Bridge and Antigravity Bridge, plus the parent profile documentation and pinned submodule revisions. It does not change release tags or install/update external plugin caches automatically.

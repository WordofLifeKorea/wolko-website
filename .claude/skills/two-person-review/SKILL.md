---
name: two-person-review
description: Work as a two-person team — after finishing any code change and before pushing or merging it, hand the diff to a separate reviewer agent with a fresh context, fix what it confirms, and have it re-check the fixes. Use for every code change (features, fixes, refactors, CSS/layout), and whenever the user mentions "2인 체계", "2인 팀", "검토자", "리뷰어", "two-person", or reviewing before pushing. Skip only for pure content or number edits (a capacity, a date, a sentence).
---

# Two-person review (2인 체계)

The person who wrote a change is the worst person to check it: they share its blind spots. So every change gets a second pair of eyes before it ships. You are the author; a separate reviewer agent is the second person.

## When

- **Always** after a code change is finished and its tests pass, **before** pushing to the shared/main branch or opening a merge.
- **Skip** for pure content or number edits with no logic: a capacity, a date, a sentence of copy, an image swap. Say in your report that it skipped review and why.
- If you already pushed something unreviewed (by mistake, or before this rule existed), review it after the fact the same way.

## Steps

1. **Finish and test.** Run the project's tests. Commit to the working branch (not main) so the reviewer can read an exact commit or range.

2. **Spawn the reviewer** with the Agent tool (`general-purpose`, run in background). Give it a fresh brief — never your own conclusions about what is right, or it will just agree with you. The brief must contain:
   - The repo path and the exact scope: `git show <sha>` or `git diff <base>..<head>`, and anything to exclude.
   - The project's rule files to read first (e.g. `AGENTS.md`, `CLAUDE.md`) and that their design/process rules are binding.
   - What the change is *meant* to do, in a few bullets (intent, not your verdict).
   - What to look for, in priority order:
     1. Correctness bugs and regressions: null access, wrong data, race conditions in async code, removed code still referenced elsewhere, missing i18n strings.
     2. Side effects on other pages/modules that share the touched files.
     3. Mobile and desktop layout (it can render with Playwright), accessibility, performance.
     4. Breaks of the project's rules.
     5. Missing or weak tests for the new logic.
   - "Do NOT edit, commit, or push — report only."
   - "Run the test suite once" (name any known pre-existing failures so it ignores them).
   - "Verify every finding before reporting: exact file:line, a concrete failure scenario, a suggested fix, and confirmed vs plausible. No style nitpicks. Rank by severity. Keep it under ~500 words."
   - Paths to any test harnesses you already built, so it can reuse them (copy, not edit).

3. **Triage the report yourself.** For each finding, check it against the code. Fix what is real. If a finding is wrong, or contradicts a decision the user already made, don't change the code — note it and tell the user. Things outside the change's scope (pre-existing bugs) become a separate task suggestion, not a silent expansion of this change.

4. **Re-review the fixes.** Send the fixes back to the *same* reviewer with SendMessage (it keeps its context), saying what you changed for each finding and what to double-check, especially new interactions your fix introduces. Fixes often create new bugs; this round is where they get caught. Repeat until the reviewer reports no confirmed problems. If a round only turns up trivially small, mechanical follow-ups you have verified yourself (e.g. "add these two selectors"), you may apply them and stop there.

5. **Ship.** Re-run the tests, then push following the project's normal rule (e.g. fast-forward to main).

6. **Report to the user**, in plain language:
   - what the review found (the real problems, in user terms, not code terms),
   - what was fixed,
   - what was deliberately left and why (and ask if they want it changed),
   - what was split into a separate task.

## Notes

- One reviewer per change. Reuse it for re-reviews rather than spawning a new one each round.
- Don't run the reviewer's checks yourself in parallel while it works — wait for its report.
- Never present the reviewer's findings as confirmed without having checked them; never present your own work as reviewed if the review was skipped.

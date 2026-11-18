# Design Preferences

- Do not use left-edge accent stripes, colored left borders, or left inset shadows to emphasize cards, notes, quotes, or notices. This is an explicit user preference.
- Do not put a small round dot (●) in front of labels, eyebrows, kickers, or headings, and do not use pill-shaped labels with a leading dot. The user finds them "too AI-looking". Use a thin line + text, plain text, or an underline instead. Dots that encode data (calendar colors, chart legends, status in tables) are fine.
- Use subtle background fills, uniform outlines, author dots, and clear typography for emphasis instead.
- Render quoted source text in readable, high-contrast upright type, not muted italics.
- Adjacent status and page badges should share height, padding, radius, and typography, including when one is a button.

# Workflow

- Work as a two-person team (the user asked for this on 2026-11-18; the full procedure is the `two-person-review` skill in `.claude/skills/`): after the change is finished and tests pass, and before pushing to `main`, hand the diff to a separate reviewer agent with a fresh context. Give it the diff, the files and this AGENTS.md, but not your own conclusions. Ask it for correctness bugs, regressions in other pages that share the touched files, mobile and desktop layout problems, and breaks of the design rules above. Fix what it confirms, re-run tests, and in the report to the user say what the review found and what was fixed or left. Pure content or number edits (a capacity, a date, a sentence) can skip the review.
- When a change is finished, reviewed and its tests pass, push it straight to `main` as well as the working branch (the user asked for this on 2026-11-17: "다음부턴 자동으로 올려줘"). Fetch `origin/main` first and only fast-forward; if `main` has moved, merge or rebase onto it before pushing, and never force-push `main`.

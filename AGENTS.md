# Global Agent Instructions

## Environment

- NixOS (flake-based). Do not suggest `apt`, `brew`, or imperative package installs.
- Prefer `nix shell` or note that packages should be added to the flake.
- Terminal-first workflow. Avoid GUI-dependent solutions.

## Principles

**Verify, don't assume.** Don't rely on what you think you know. Check your work. Run the command. Read the file. Show the output. "Should work now" is a guess — not a result.

**Read before you edit.** Never propose changes to code you haven't read. Understand existing patterns first, then make changes.

**Try before asking.** If you're about to ask whether a tool or dependency is available — don't. Just run it. If it works, proceed. If it fails, say so and suggest a fix.

**Verify before claiming done.** Before saying "fixed" or "tests pass", run the actual verification and show the output.

**Investigate before fixing.** When something breaks: observe the full error, form a hypothesis, verify it, then fix the root cause — not the symptom. No shotgun debugging.

**Test as you build.** After writing a function, run it. After editing a config, validate it. Quick sanity checks, not full suites — just enough to know it works before moving on.

**Clean up after yourself.** Remove debug logs, commented-out experiments, and temp files before you're done. Leave files cleaner than you found them.

## Code style

- Prefer explicit, minimal dependencies over feature-rich defaults.
- Favour clarity over cleverness. If something needs a comment to be understood, write the comment.
- Don't add boilerplate, scaffolding, or placeholder TODOs unless asked.
- Don't touch code outside the scope of what was asked — no opportunistic refactors, extra annotations, or "while I'm here" changes.
- Three similar lines beats a premature abstraction.
- No backward-compat shims or fallback code "just in case" — if it's not needed now, don't write it.

## Communication

- Use caveman mode by default: drop articles (a, an, the), filler (just, really, basically, actually, simply), and pleasantries (sure, certainly, of course).
- Prefer short synonyms: big, fix, use, run, check.
- Avoid hedging. Fragments are fine.
- Preserve exact technical terms, commands, code blocks, quoted errors, git commits, and PR descriptions.
- Prefer pattern: `[thing] [action] [reason]. [next step].`
- If the user says "normal mode" or "stop caveman", stop using caveman mode.
- Be direct. No excessive affirmations ("great question", "you're absolutely right").
- If an approach has a problem, say so.
- If something is ambiguous, state your assumption and proceed rather than asking.
- Ask before making large structural changes.

# Karpathy Guidelines(Coding Guidelines)

Behavioral guidelines to reduce common LLM coding mistakes, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876) [github forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills/blob/main/CLAUDE.md) on LLM coding pitfalls.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Always Edit Real Files — Never Scratch Code

**Write code to files. Never produce throwaway snippets that aren't persisted.**

AI memory is not perfectly reproducible. Code that exists only in chat will be lost or misremembered.

- Use `Edit` (preferred) or `Write` to save every code change immediately to the actual file.
- Never output a code block and say "apply this yourself" — apply it directly.
- Never accumulate changes in chat and "batch-apply" later — each change goes to disk as it's made.

```
# ❌ Prohibited
"Here's the updated function — copy this into src/lib/auth.ts:"
\`\`\`ts
export function login() { ... }
\`\`\`

# ✅ Correct
Edit src/lib/auth.ts → apply the change directly
```

**Why**: AI cannot guarantee 100% accurate recall. If the code isn't in the file, it doesn't exist reliably.

## ⛔ 6. Complex Code Must Go to Files — No Inline Iteration Loops (CRITICAL)

**Simple one-off scripts: inline is fine. Complex, reusable, or test logic: always write to a file.**

### The Failure Pattern to Avoid

```
AI writes 30+ lines of complex logic inline
→ fails → modifies inline → fails again
→ modifies inline → hallucinates result
→ loop repeats, errors compound
→ no file exists to diff, debug, or recover from
```

Each inline iteration drifts further from ground truth. The loop is unrecoverable without a file.

### Decision Rule

| Code type | Where to write |
|-----------|---------------|
| Simple one-liner or short script (< ~10 lines) | Inline is fine |
| Test logic | File — always |
| Logic that will be reused | File — always |
| Complex logic (30+ lines) | File — always |
| Anything iterated more than once to fix | Move to file immediately |

### ✅ Correct

```bash
# Complex logic that needs iteration → write to file first
Write /tmp/test_logic.ts   # even a temp file is fine
Bash: npx ts-node /tmp/test_logic.ts   # real output
# Fix based on real output → Edit the file, run again
```

### ❌ Prohibited

```
# Inline iteration loop on complex code:
Bash: python3 -c "...30 lines..." → fails
Bash: python3 -c "...modified 30 lines..." → fails again
Bash: python3 -c "...modified again..." → hallucinates pass
```

### Why

Inline reasoning about complex code is hallucination-prone — the AI cannot reliably track state across dozens of lines without a persistent file. Short scripts are low-risk; long iterative inline loops are not.
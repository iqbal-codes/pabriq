---
name: pabriq-report-safe-test-script-only
description: "Report or propose pabriq-app-v2 tests only through package scripts that load the safe test environment"
condition: ["(?:Tests?|Ran|Running|Verify|Verification)[^\\n`]*`(?:[^`]*\\s)?(?:npx|bunx)\\s+vitest(?:\\s+run)?[^`]*`", "(?:Tests?|Ran|Running|Verify|Verification)[^\\n`]*`(?:[^`]*\\s)?vitest(?:\\s+run)?[^`]*`", "(?:Tests?|Ran|Running|Verify|Verification)[^\\n`]*`(?:[^`]*\\s)?bun\\s+test\\b[^`]*`"]
scope: "text"
---

Stop before reporting or proposing this test command. In `pabriq-app-v2`, direct unit-test runner invocations can load the wrong environment and destroy dev/production data.

Use the repository scripts from `package.json` so `.env.test` / staging Infisical wiring is applied:

- Unit/integration tests: `bun run test`
- E2E tests: `bun run test:e2e`
- Narrower runs must still go through the repo's safe test environment wrapper/script, not direct `vitest`, `jest`, `playwright test`, `bun test`, `npx ...`, or `bunx ...`.

If you already ran a direct runner, say so explicitly and do not claim safe verification.
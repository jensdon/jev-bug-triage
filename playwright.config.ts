import { defineConfig } from "@playwright/test";

export default defineConfig({
    reporter: [["list"], ["./triage-reporter.ts"]],
});

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import type { FullConfig, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { type Category, isConfigured, triage } from "./triage.ts";

type Result = { title: string; category: Category | "triage failed"; note?: string };

export default class TriageReporter implements Reporter {
    private outputDir = "test-results";
    private pending: Promise<Result>[] = [];

    onBegin(config: FullConfig) {
        this.outputDir = config.projects[0]?.outputDir ?? this.outputDir;
        if (!isConfigured) console.warn("[triage] OPENROUTER_API_KEY is not set, failed tests will not be triaged");
    }

    onTestEnd(test: TestCase, result: TestResult) {
        if (!isConfigured || (result.status !== "failed" && result.status !== "timedOut")) return;
        // File name plus test name, so tests with the same name in different files stay apart
        const title = test.titlePath().slice(2).join(" › ");
        this.pending.push(
            triage(triageInput(result))
                .then((category): Result => ({ title, category }))
                .catch((e: unknown): Result => ({
                    title,
                    category: "triage failed",
                    note: e instanceof Error ? e.message : String(e),
                })),
        );
    }

    async onEnd() {
        const results = await Promise.all(this.pending);
        if (results.length === 0) return;
        const counts: Partial<Record<Result["category"], number>> = {};
        for (const r of results) counts[r.category] = (counts[r.category] ?? 0) + 1;
        console.log("\n[triage]");
        for (const r of results) console.log(`  ${r.title} → ${r.category}${r.note ? `: ${r.note}` : ""}`);
        writeReport(this.outputDir, counts);
    }
}

// Playwright's error-context.md without its "# Instructions" header, or just the error message if there is none
function triageInput(result: TestResult) {
    const contextFile = result.attachments.find((a) => a.name === "error-context")?.path;
    const text = contextFile ? readFileSync(contextFile, "utf8") : "";
    const start = text.indexOf("# Test info");
    return start >= 0 ? text.slice(start) : stripVTControlCharacters(result.error?.message ?? result.status);
}

// Fills the counts into the triage-report.html template
function writeReport(outputDir: string, counts: Partial<Record<Result["category"], number>>) {
    const template = readFileSync(new URL("triage-report.html", import.meta.url), "utf8");
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
        join(outputDir, "triage-report.html"),
        template.replace(/\/\* COUNTS \*\/ .*;/, () => `${JSON.stringify(counts)};`),
    );
}

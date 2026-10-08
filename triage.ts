import { existsSync } from "node:fs";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

// Locally the key comes from .env; in CI it is usually set as an environment variable
if (existsSync(".env")) process.loadEnvFile();

export const isConfigured = Boolean(process.env.OPENROUTER_API_KEY);

// Created on first use: the SDK throws without an API key, which would block loading this file
let client: TypeSafeClient | undefined;

export type Category = Awaited<ReturnType<typeof triage>>;

export async function triage(error: string) {
    client ??= new TypeSafeClient({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api",
    });
    const response = await client.systemOne({
        state: { document: error },
        questions: {
            category: choice("What type of bug is this?", {
                "To investigate":
                    "Not enough information to determine the cause, e.g. an element is missing and there is no page snapshot to check.",
                "Product bug":
                    "The application behaves incorrectly: an expected element is missing from the page snapshot or in the wrong state, wrong output, wrong data, broken functionality.",
                "Automation issue":
                    "The test itself is wrong: the element is in the page snapshot but the locator does not match it (different name, role or text), timing or flaky waits, outdated test steps.",
                "System issue":
                    "Infrastructure or environment problem: the page snapshot shows an error page or nothing loaded, server errors, network failures, environment or service down.",
            }),
        },
    });
    return response.answers.category.choice;
}

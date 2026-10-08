import { test, expect } from "@playwright/test";

const pageUrl = (name: string) => new URL(`pages/${name}.html`, import.meta.url).href;

test("cart total is the sum of the items", async ({ page }) => {
    await page.goto(pageUrl("cart"));
    await expect(page.getByTestId("total")).toHaveText("€ 25,00");
});

test("settings can be saved", async ({ page }) => {
    await page.goto(pageUrl("settings"));
    await page.getByRole("button", { name: "Save", exact: true }).click({ timeout: 2000 });
});

test("login page loads", async ({ page }) => {
    await page.goto("http://localhost:59999/login");
});

test("dashboard shows the welcome message", async ({ page }) => {
    await page.goto(pageUrl("dashboard"));
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 2000 });
});

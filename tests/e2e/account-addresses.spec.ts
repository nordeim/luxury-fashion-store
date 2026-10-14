// Account addresses — session 5, H-4 + H-8: the address CRUD seam had NO
// coverage, and the edit prefill was structurally broken (uncontrolled
// defaultValue on already-mounted inputs — clicking Edit submitted stale
// fields). Pins: add → edit prefill (the H-4 regression) → change → persist
// → set default → delete. Runs on the demo customer's storage state.
import { expect, test } from "@playwright/test";

test.describe("account addresses", () => {
  test("add, edit-prefill, update, set-default, delete (H-4/H-8)", async ({ page }) => {
    await page.goto("/account");
    await page.getByRole("tab", { name: "Addresses" }).click();
    const form = page.getByTestId("address-form");
    // A unique label scopes every card action (aria-labels are `Edit {label}`).
    const card = page.locator("div.border-border").filter({ hasText: "E2E HQ" }).filter({ has: page.getByText("E2E Recipient") });

    // 1) ADD — a fresh address appears in the list.
    await form.getByLabel("Label").fill("E2E HQ");
    await form.getByLabel("Full Name").fill("E2E Recipient");
    await form.getByLabel("Street").fill("9 Parity Lane");
    await form.getByLabel("City", { exact: true }).fill("Metz");
    await form.getByLabel("State").fill("FR");
    await form.getByLabel("ZIP").fill("57000");
    await form.getByRole("button", { name: /save address/i }).click();
    await expect(page.getByRole("status")).toHaveText("Address saved.");
    await expect(card.getByText("E2E Recipient")).toBeVisible();

    // 2) EDIT PREFILL (H-4) — clicking Edit must remount the form with the
    // address's values, NOT the previous mount's stale defaults.
    await card.getByRole("button", { name: "Edit E2E HQ" }).click();
    await expect(form.getByLabel("Full Name")).toHaveValue("E2E Recipient");
    await expect(form.getByLabel("Street")).toHaveValue("9 Parity Lane");
    await expect(form.getByLabel("City", { exact: true })).toHaveValue("Metz");
    await expect(form.getByLabel("State")).toHaveValue("FR");
    await expect(form.getByLabel("ZIP")).toHaveValue("57000");
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    // 3) UPDATE — change the street; the list reflects it after save.
    await form.getByLabel("Street").fill("13 Remounted Court");
    await form.getByRole("button", { name: /save address/i }).click();
    await expect(page.getByRole("status")).toHaveText("Address saved.");
    await expect(page.getByText("13 Remounted Court")).toBeVisible();

    // 4) SET DEFAULT — the badge moves to this address.
    await card.getByRole("button", { name: /set default/i }).click();
    await expect(card.getByText("Default")).toBeVisible();

    // 5) DELETE — the address disappears.
    await card.getByRole("button", { name: "Delete E2E HQ" }).click();
    await expect(page.getByText("13 Remounted Court")).not.toBeVisible({ timeout: 10_000 });
  });
});

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { freezeTime, installMockApi } from "./mockApi";

const AFTER_CUTOFF_NOW = "2026-03-02T10:00:00+05:30";
const BEFORE_CUTOFF_NOW = "2026-03-02T08:45:00+05:30";
const COOKIE_SAFE_NOW = "2030-03-02T10:00:00+05:30";
const MEMBER_ID = "m1";

async function setSelectedMemberCookie(page: Page) {
  await page.context().addCookies([
    {
      name: "lastSelectedMember",
      value: MEMBER_ID,
      url: "http://127.0.0.1:4173",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function loadWithMocks(
  page: Page,
  options: {
    nowIso: string;
    forceCutoffBookDates?: string[];
    forceDuplicateBookDates?: string[];
    inactiveMemberIds?: string[];
    setMemberCookie?: boolean;
  },
) {
  await freezeTime(page, options.nowIso);
  await installMockApi(page, {
    nowIso: options.nowIso,
    forceCutoffBookDates: options.forceCutoffBookDates,
    forceDuplicateBookDates: options.forceDuplicateBookDates,
    inactiveMemberIds: options.inactiveMemberIds,
  });
  if (options.setMemberCookie !== false) {
    await setSelectedMemberCookie(page);
  }
  await page.goto("/");
}

test("tabs and shell layout does not regress", async ({ page }) => {
  await loadWithMocks(page, { nowIso: AFTER_CUTOFF_NOW });

  await expect(page.getByTestId("tab-recent-activity")).toBeVisible();
  await expect(page.getByTestId("quick-booking-card")).toBeVisible();

  await page.getByTestId("tab-monthly-participation-button").click();
  await expect(page.getByTestId("tab-monthly-participation")).toBeVisible();
  await expect(page.getByTestId("quick-booking-card")).toBeVisible();

  await page.getByTestId("tab-ai-chat-button").click();
  await expect(page.getByTestId("tab-ai-chat")).toBeVisible();
  await expect(page.getByTestId("quick-booking-card")).toHaveCount(0);
});

test("selected member persists via cookie across reloads", async ({ page }) => {
  await loadWithMocks(page, { nowIso: COOKIE_SAFE_NOW, setMemberCookie: false });

  await page.getByTestId("select-member").click();
  await page.locator("[role='option']", { hasText: "Kaushal" }).first().click();
  await expect(page.getByText("Selected: Kaushal")).toBeVisible();

  await expect
    .poll(async () => page.evaluate(() => document.cookie))
    .toContain(`lastSelectedMember=${MEMBER_ID}`);

  await page.reload();
  await expect(page.getByText("Selected: Kaushal")).toBeVisible();
});

test("inactive members are hidden from quick booking and stale cookies are cleared", async ({ page }) => {
  await loadWithMocks(page, {
    nowIso: AFTER_CUTOFF_NOW,
    inactiveMemberIds: ["m1"],
  });

  await expect(page.getByText("Selected: Kaushal")).toHaveCount(0);
  await expect(page.getByTestId("booked-members-2026-03-04")).toContainText("Kaushal");

  await page.getByTestId("select-member").click();
  await expect(page.locator("[role='option']", { hasText: "Kaushal" })).toHaveCount(0);
  await expect(page.locator("[role='option']", { hasText: "Kumar" })).toHaveCount(1);

  await expect
    .poll(async () => page.evaluate(() => document.cookie))
    .not.toContain("lastSelectedMember=");
});

test("previous-week traversal remains available for viewing comments and history", async ({ page }) => {
  await loadWithMocks(page, { nowIso: AFTER_CUTOFF_NOW });

  await expect(page.getByTestId("next-week-button")).toBeDisabled();
  await page.getByTestId("prev-week-button").click();

  await expect(page.getByTestId("day-card-2026-02-24")).toBeVisible();
  await page.getByTestId("button-comments-sheet-2026-02-24").click();
  await expect(page.getByText("Comments for February 24, 2026")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByTestId("booking-history-btn-2026-02-24").click();
  await expect(page.getByText("Booking History for Tue, Feb 24, 2026")).toBeVisible();
});

test("day card state matrix and capacity boundary are preserved", async ({ page }) => {
  await loadWithMocks(page, { nowIso: AFTER_CUTOFF_NOW });

  await expect(page.getByTestId("day-label-2026-03-02")).toContainText("Today (Closed)");
  await expect(page.getByTestId("button-book-slot-2026-03-02")).toBeDisabled();
  await expect(page.getByTestId("button-book-slot-2026-03-02")).toContainText("Closed");

  await expect(page.getByTestId("slot-count-2026-03-02")).toContainText("1/6");
  await expect(page.getByTestId("slot-count-2026-03-03")).toContainText("5/5");
  await expect(page.getByTestId("button-book-slot-2026-03-03")).toBeDisabled();
  await expect(page.getByTestId("button-book-slot-2026-03-03")).toContainText("Fully Booked");
});

test("book slot success updates card occupancy and recent activity", async ({ page }) => {
  await loadWithMocks(page, { nowIso: AFTER_CUTOFF_NOW });

  await page.getByTestId("button-book-slot-2026-03-05").click();

  await expect(page.getByTestId("slot-count-2026-03-05")).toContainText("1/5");
  await expect(page.getByTestId("booked-members-2026-03-05")).toContainText("Kaushal");
  await expect(page.getByTestId("recent-activity")).toContainText("Kaushal");
  await expect(page.getByTestId("recent-activity")).toContainText("booked");
});

test("duplicate and full-capacity protection stay user-friendly", async ({ page }) => {
  await loadWithMocks(page, {
    nowIso: AFTER_CUTOFF_NOW,
    forceDuplicateBookDates: ["2026-03-05"],
  });

  await expect(page.getByTestId("button-book-slot-2026-03-03")).toContainText("Fully Booked");
  await expect(page.getByTestId("button-book-slot-2026-03-03")).toBeDisabled();

  await page.getByTestId("button-book-slot-2026-03-05").click();
  await expect(page.getByText("Already booked", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".destructive", { hasText: "Already booked" })).toHaveCount(0);
});

test("allowed cancellation updates occupancy and activity", async ({ page }) => {
  await loadWithMocks(page, { nowIso: AFTER_CUTOFF_NOW });

  await expect(page.getByTestId("button-book-slot-2026-03-04")).toContainText("Cancel Booking");
  await page.getByTestId("button-book-slot-2026-03-04").click();

  await expect(page.getByTestId("slot-count-2026-03-04")).toContainText("0/5");
  await expect(page.getByTestId("day-card-2026-03-04")).toContainText("No bookings yet");
  await expect(page.getByTestId("recent-activity")).toContainText("cancelled");
});

test("cutoff rejection uses neutral UX fallback (no destructive toast)", async ({ page }) => {
  await loadWithMocks(page, {
    nowIso: BEFORE_CUTOFF_NOW,
    forceCutoffBookDates: ["2026-03-02"],
  });

  await expect(page.getByTestId("button-book-slot-2026-03-02")).toContainText("Book Slot");
  await page.getByTestId("button-book-slot-2026-03-02").click();

  await expect(page.getByText("Booking closed", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".destructive", { hasText: "Booking closed" })).toHaveCount(0);
});

test("comments and booking history interactions remain functional", async ({ page }) => {
  await loadWithMocks(page, { nowIso: AFTER_CUTOFF_NOW });

  await expect(page.locator("[data-testid='button-comments-sheet-2026-03-02'] .badge-count")).toContainText("1");
  await page.getByTestId("button-comments-sheet-2026-03-02").click();
  await page.getByTestId("textarea-comment-2026-03-02").fill("Will bring shuttles");
  await page.getByTestId("button-add-comment-2026-03-02").click();
  await expect(page.getByText("Will bring shuttles")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
  await expect(page.locator("[data-testid='button-comments-sheet-2026-03-02'] .badge-count")).toContainText("2");

  await page.getByTestId("booking-history-btn-2026-03-04").click();
  await expect(page.getByText("Current Booking")).toBeVisible();
});

test("monthly participation math and sorting remain deterministic", async ({ page }) => {
  await loadWithMocks(page, { nowIso: AFTER_CUTOFF_NOW });

  await page.getByTestId("tab-monthly-participation-button").click();
  await expect(page.getByTestId("month-year-label")).toContainText("March 2026");

  const firstName = page.locator("[data-testid^='member-row-']").first().locator("[data-testid^='member-name-']");
  await expect(firstName).toContainText("Main hoon na");

  await page.getByTestId("sort-name").click();
  await page.getByTestId("sort-name").click();
  await expect(firstName).toContainText("Anjali");

  await page.getByTestId("sort-bookings").click();
  await expect(firstName).toContainText("Main hoon na");
});

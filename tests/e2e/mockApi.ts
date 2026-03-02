import { Page, Route } from "@playwright/test";
import { getMaxCapacityForDate } from "../../shared/booking-capacity";
import {
  isSameDayLockedAfterCutoffInIst,
  SAME_DAY_BOOKING_LOCK_MESSAGE,
} from "../../shared/booking-time-policy";

type Member = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  createdAt: string;
};

type Booking = {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  createdAt: string;
};

type Activity = {
  id: string;
  memberId: string;
  memberName: string;
  action: string;
  date: string;
  deviceInfo: string;
  createdAt: string;
};

type Comment = {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  comment: string;
  createdAt: string;
};

type MockApiOptions = {
  nowIso: string;
  forceCutoffBookDates?: string[];
  forceDuplicateBookDates?: string[];
};

const TEST_DEVICE = "Playwright (Chromium)";

function createInitialMembers(): Member[] {
  return [
    { id: "m1", name: "Kaushal", initials: "K", avatarColor: "green", createdAt: "2026-01-01T09:00:00.000Z" },
    { id: "m2", name: "Main hoon na", initials: "MN", avatarColor: "blue", createdAt: "2026-01-01T09:01:00.000Z" },
    { id: "m3", name: "RK", initials: "RK", avatarColor: "purple", createdAt: "2026-01-01T09:02:00.000Z" },
    { id: "m4", name: "Anjali", initials: "A", avatarColor: "yellow", createdAt: "2026-01-01T09:03:00.000Z" },
    { id: "m5", name: "He-man", initials: "HM", avatarColor: "pink", createdAt: "2026-01-01T09:04:00.000Z" },
    { id: "m6", name: "Kumar", initials: "K", avatarColor: "indigo", createdAt: "2026-01-01T09:05:00.000Z" },
    { id: "m7", name: "Ashish", initials: "A", avatarColor: "teal", createdAt: "2026-01-01T09:06:00.000Z" },
  ];
}

function createInitialBookings(): Booking[] {
  return [
    { id: "b-1", memberId: "m2", memberName: "Main hoon na", date: "2026-03-02", createdAt: "2026-03-01T10:00:00.000Z" },
    { id: "b-2", memberId: "m2", memberName: "Main hoon na", date: "2026-03-03", createdAt: "2026-03-01T10:05:00.000Z" },
    { id: "b-3", memberId: "m3", memberName: "RK", date: "2026-03-03", createdAt: "2026-03-01T10:06:00.000Z" },
    { id: "b-4", memberId: "m4", memberName: "Anjali", date: "2026-03-03", createdAt: "2026-03-01T10:07:00.000Z" },
    { id: "b-5", memberId: "m5", memberName: "He-man", date: "2026-03-03", createdAt: "2026-03-01T10:08:00.000Z" },
    { id: "b-6", memberId: "m6", memberName: "Kumar", date: "2026-03-03", createdAt: "2026-03-01T10:09:00.000Z" },
    { id: "b-7", memberId: "m1", memberName: "Kaushal", date: "2026-03-04", createdAt: "2026-03-01T10:10:00.000Z" },
    { id: "b-8", memberId: "m3", memberName: "RK", date: "2026-02-24", createdAt: "2026-02-20T10:11:00.000Z" },
    { id: "b-9", memberId: "m2", memberName: "Main hoon na", date: "2026-03-06", createdAt: "2026-03-01T10:12:00.000Z" },
  ];
}

function createInitialActivities(): Activity[] {
  return [
    { id: "a-1", memberId: "m2", memberName: "Main hoon na", action: "booked a slot for", date: "2026-03-02", deviceInfo: TEST_DEVICE, createdAt: "2026-03-01T10:00:00.000Z" },
    { id: "a-2", memberId: "m2", memberName: "Main hoon na", action: "booked a slot for", date: "2026-03-03", deviceInfo: TEST_DEVICE, createdAt: "2026-03-01T10:05:00.000Z" },
    { id: "a-3", memberId: "m1", memberName: "Kaushal", action: "booked a slot for", date: "2026-03-04", deviceInfo: TEST_DEVICE, createdAt: "2026-03-01T10:10:00.000Z" },
    { id: "a-4", memberId: "m3", memberName: "RK", action: "booked a slot for", date: "2026-02-24", deviceInfo: TEST_DEVICE, createdAt: "2026-02-20T10:11:00.000Z" },
  ];
}

function createInitialComments(): Comment[] {
  return [
    { id: "c-1", memberId: "m3", memberName: "RK", date: "2026-02-24", comment: "Nice session", createdAt: "2026-02-24T03:00:00.000Z" },
    { id: "c-2", memberId: "m2", memberName: "Main hoon na", date: "2026-03-02", comment: "Will be late by 5 mins", createdAt: "2026-03-02T02:00:00.000Z" },
  ];
}

function json(route: Route, status: number, payload: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export async function freezeTime(page: Page, nowIso: string) {
  await page.addInitScript(({ now }) => {
    const fixed = new Date(now).valueOf();
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fixed);
        } else {
          super(...(args as [any]));
        }
      }
      static now() {
        return fixed;
      }
      static parse(dateString: string) {
        return RealDate.parse(dateString);
      }
      static UTC(...args: any[]) {
        return RealDate.UTC(...args);
      }
    }

    (window as any).Date = MockDate;
  }, { now: nowIso });
}

export async function installMockApi(page: Page, options: MockApiOptions) {
  const members = createInitialMembers();
  const bookings = createInitialBookings();
  const activities = createInitialActivities();
  const comments = createInitialComments();

  let idCounter = 100;
  const now = new Date(options.nowIso);

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pathname = url.pathname;
    const method = req.method();

    if (pathname === "/api/members" && method === "GET") {
      return json(route, 200, members);
    }

    if (pathname === "/api/bookings" && method === "GET") {
      return json(route, 200, [...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }

    if (pathname === "/api/bookings" && method === "POST") {
      const payload = req.postDataJSON() as {
        memberId: string;
        memberName: string;
        date: string;
      };

      if (
        options.forceCutoffBookDates?.includes(payload.date) ||
        isSameDayLockedAfterCutoffInIst(payload.date, now)
      ) {
        return json(route, 400, { message: SAME_DAY_BOOKING_LOCK_MESSAGE });
      }

      if (
        options.forceDuplicateBookDates?.includes(payload.date) ||
        bookings.some((booking) => booking.memberId === payload.memberId && booking.date === payload.date)
      ) {
        return json(route, 409, { message: "Member already has a booking for this date" });
      }

      const bookedCount = bookings.filter((booking) => booking.date === payload.date).length;
      const capacity = getMaxCapacityForDate(payload.date);
      if (bookedCount >= capacity) {
        return json(route, 400, {
          message: `This date is fully booked (${capacity}/${capacity} slots)`,
        });
      }

      const createdAt = new Date(now.getTime() + idCounter * 1000).toISOString();
      const booking: Booking = {
        id: `b-${idCounter}`,
        memberId: payload.memberId,
        memberName: payload.memberName,
        date: payload.date,
        createdAt,
      };
      bookings.push(booking);
      activities.unshift({
        id: `a-${idCounter}`,
        memberId: payload.memberId,
        memberName: payload.memberName,
        action: "booked a slot for",
        date: payload.date,
        deviceInfo: TEST_DEVICE,
        createdAt,
      });
      idCounter += 1;
      return json(route, 200, booking);
    }

    const bookingMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/([^/]+)$/);
    if (bookingMatch && method === "DELETE") {
      const memberId = decodeURIComponent(bookingMatch[1] || "");
      const date = decodeURIComponent(bookingMatch[2] || "");

      if (isSameDayLockedAfterCutoffInIst(date, now)) {
        return json(route, 400, { message: SAME_DAY_BOOKING_LOCK_MESSAGE });
      }

      const index = bookings.findIndex(
        (booking) => booking.memberId === memberId && booking.date === date,
      );
      if (index === -1) {
        return json(route, 404, { message: "Booking not found" });
      }

      const [deleted] = bookings.splice(index, 1);
      activities.unshift({
        id: `a-${idCounter}`,
        memberId,
        memberName: deleted.memberName,
        action: "cancelled a slot for",
        date,
        deviceInfo: TEST_DEVICE,
        createdAt: new Date(now.getTime() + idCounter * 1000).toISOString(),
      });
      idCounter += 1;

      return json(route, 200, { message: "Booking cancelled successfully" });
    }

    if (pathname === "/api/activities" && method === "GET") {
      return json(route, 200, [...activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }

    const activitiesMatch = pathname.match(/^\/api\/activities\/(\d{4}-\d{2}-\d{2})$/);
    if (activitiesMatch && method === "GET") {
      const date = activitiesMatch[1];
      const day = activities
        .filter((activity) => activity.date === date)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json(route, 200, day);
    }

    if (pathname === "/api/comments" && method === "GET") {
      return json(route, 200, comments);
    }

    const commentsMatch = pathname.match(/^\/api\/comments\/(\d{4}-\d{2}-\d{2})$/);
    if (commentsMatch && method === "GET") {
      const date = commentsMatch[1];
      const day = comments
        .filter((comment) => comment.date === date)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return json(route, 200, day);
    }

    if (pathname === "/api/comments" && method === "POST") {
      const payload = req.postDataJSON() as {
        memberId: string;
        memberName: string;
        date: string;
        comment: string;
      };

      const created: Comment = {
        id: `c-${idCounter}`,
        memberId: payload.memberId,
        memberName: payload.memberName,
        date: payload.date,
        comment: payload.comment,
        createdAt: new Date(now.getTime() + idCounter * 1000).toISOString(),
      };
      comments.unshift(created);
      idCounter += 1;
      return json(route, 200, created);
    }

    if (pathname === "/api/ai/chat" && method === "POST") {
      return json(route, 200, {
        reply: "Mocked response",
        mode: "answer",
        meta: { requestId: "mock-request-id" },
      });
    }

    if (pathname === "/api/ai/chat/stream" && method === "GET") {
      return route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
        },
        body: "",
      });
    }

    return json(route, 404, { message: `Unhandled API route: ${method} ${pathname}` });
  });
}

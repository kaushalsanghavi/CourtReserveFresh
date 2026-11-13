import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import BookingCalendar from "@/components/BookingCalendar";
import type { Booking, Member } from "@shared/schema";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/lib/haptics", () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock("@/components/QuickBooking", () => ({
  useSelectedMember: () => ({
    selectedMemberId: "member-1",
    selectedMember: {
      id: "member-1",
      name: "Kaushal",
    },
  }),
}));

vi.mock("@/components/CommentsAlternative", () => ({
  default: () => React.createElement("div", null, "Comments"),
}));

vi.mock("@/components/BookingHistory", () => ({
  default: () => React.createElement("div", null, "History"),
}));

const members: Member[] = [
  {
    id: "member-1",
    name: "Kaushal",
    initials: "K",
    avatarColor: "yellow",
    isActive: true,
    statusChangedAt: new Date("2026-06-01T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  },
];

const bookings: Booking[] = [];

function renderBookingCalendar(seedBookings: Booking[] = bookings) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  queryClient.setQueryData(["/api/members"], members);
  queryClient.setQueryData(["/api/bookings"], seedBookings);

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(BookingCalendar),
    ),
  );
}

describe("BookingCalendar mobile week sections", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders "Earlier this week" between the current week label and upcoming days', () => {
    renderBookingCalendar();

    const weekHeading = screen.getByText((content) => content.replace(/\s+/g, " ").trim() === "Week of Jun 4");
    const earlierThisWeek = screen.getByText("Earlier this week");
    const currentDay = screen.getByText("Thu, Jun 4");

    expect(weekHeading.compareDocumentPosition(earlierThisWeek) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(earlierThisWeek.compareDocumentPosition(currentDay) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides "Earlier this week" after navigating to a previous week', () => {
    renderBookingCalendar();

    fireEvent.click(screen.getByTestId("prev-week-button"));

    expect(screen.queryByText("Earlier this week")).not.toBeInTheDocument();
    expect(screen.getByText((content) => content.replace(/\s+/g, " ").trim() === "Week of May 25")).toBeInTheDocument();
  });
});

describe("BookingCalendar weekly counts", () => {
  const makeBooking = (id: string, memberId: string, memberName: string, date: string): Booking => ({
    id,
    memberId,
    memberName,
    date,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows weekly counts only on full days and reveals details on tap", () => {
    const seeded = [
      makeBooking("a1", "member-1", "Kaushal", "2026-06-01"),
      makeBooking("a2", "member-1", "Kaushal", "2026-06-02"),
      makeBooking("a3", "member-1", "Kaushal", "2026-06-03"),
      makeBooking("a4", "member-1", "Kaushal", "2026-06-04"),
      makeBooking("b1", "member-2", "Asha", "2026-06-04"),
      makeBooking("b2", "member-3", "Dev", "2026-06-04"),
      makeBooking("b3", "member-4", "Meera", "2026-06-04"),
      makeBooking("b4", "member-5", "Rohan", "2026-06-04"),
      makeBooking("c1", "member-2", "Asha", "2026-06-03"),
    ];
    renderBookingCalendar(seeded);

    // Jun 3 is not full (2/5): no counts. Jun 4 is full (5/5): counts shown.
    expect(screen.queryByTestId("weekly-count-member-1-2026-06-03")).not.toBeInTheDocument();
    const pill = screen.getByTestId("weekly-count-member-1-2026-06-04");
    expect(pill).toHaveTextContent("4");
    expect(pill).toHaveAttribute("data-level", "heavy");
    expect(screen.getByTestId("weekly-count-member-2-2026-06-04")).toHaveAttribute("data-level", "normal");

    fireEvent.click(pill);
    const details = screen.getByTestId("weekly-count-details-member-1-2026-06-04");
    expect(details).toHaveTextContent("4 days booked this week");
    expect(details).toHaveTextContent("18% of the month booked");
  });
});

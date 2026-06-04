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

function renderBookingCalendar() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  queryClient.setQueryData(["/api/members"], members);
  queryClient.setQueryData(["/api/bookings"], bookings);

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

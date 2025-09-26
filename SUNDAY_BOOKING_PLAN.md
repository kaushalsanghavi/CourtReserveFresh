# Sunday Booking Feature Implementation Plan

## 1. Backend (API)

### 1.1. Database Schema
-   No changes seem to be needed to the database schema at this point. We can use the existing `bookings` table. We will need to distinguish Sunday bookings from regular bookings. We can add a new field to the `bookings` table, or use the day of the week.

### 1.2. API Endpoints
-   **`GET /api/sunday-bookings`**:
    -   Fetches the booking status for the upcoming Sundays.
    -   For each Sunday, it should return:
        -   The date.
        -   The time if it has been set.
        -   The number of players who have booked.
        -   A list of players who have booked.
-   **`POST /api/sunday-bookings`**:
    -   Creates a new booking for a Sunday.
    -   If the user is the first to book, this endpoint should also set the time for that day.
    -   It should validate that the user is a member.
-   **`PUT /api/sunday-bookings/:date`**:
    -   Updates the time for a Sunday booking. This should only be allowed for the user who first set the time.

## 2. Frontend (Client)

### 2.1. Create a new component `SundayBooking.tsx`
-   This component will be responsible for rendering the Sunday booking section.
-   It will fetch data from the `/api/sunday-bookings` endpoint.
-   It will display the accordion with the Sunday booking cards.

### 2.2. Implement the Sunday Booking Card
-   Create a new component for the Sunday booking card.
-   It will have two states:
    -   **Empty State:** Shows "No Time Set" and a "Book & Set Time" button.
    -   **Partially Booked State:** Shows the time, number of players, a list of players, and a "Book Slot" button.

### 2.3. Implement the "Book & Set Time" Modal
-   Create a modal that opens when a user clicks the "Book & Set Time" button.
-   The modal will have a time input field.
-   When the user confirms, it will make a `POST` request to `/api/sunday-bookings` with the selected time.

### 2.4. Integrate `SundayBooking.tsx` into the Home Page
-   Add the `SundayBooking.tsx` component to the main application page.

## 3. Data Flow

1.  The `SundayBooking` component fetches data from `GET /api/sunday-bookings`.
2.  The component renders the Sunday booking cards based on the.
3.  When a user clicks "Book & Set Time", the modal appears.
4.  The user sets the time and clicks "Confirm Booking".
5.  A `POST` request is sent to `/api/sunday-bookings` with the user's booking and the selected time.
6.  The server creates the booking and sets the time for that Sunday.
7.  The `SundayBooking` component re-fetches the data to show the updated state.
8.  When a user clicks "Book Slot", a `POST` request is sent to `/api/sunday-bookings`.
9.  The server creates the booking.
10. The `SundayBooking` component re-fetches the data.

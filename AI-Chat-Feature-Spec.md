# AI Chat Feature: Business Requirements & Technical Specification

This document outlines the plan for implementing an in-app AI assistant.

---

## 1. Business Requirements

### 1.1. Objective

To improve user engagement and efficiency by allowing users to ask questions about application data and (in a future phase) perform actions using a natural language chat interface.

### 1.2. Scope

#### In Scope:
- **Conversational Queries:** Users can ask questions about bookings, members, and participation statistics.
- **Contextual Awareness:** The AI assistant's knowledge is strictly limited to the data within this application.
- **Relevance Enforcement:** The AI must politely decline to answer any questions not related to the application (e.g., weather, general knowledge).
- **UI Integration:** The feature will be accessible via a dedicated "AI Chat" tab in the main navigation, leading to a full-screen chat interface.

#### Out of Scope (for initial release):
- **Action-Oriented Commands:** The AI will not perform actions like booking or cancelling slots in this first version. This can be a fast-follow feature.
- **User-Specific Context:** The AI will not initially have memory of the specific user who is asking the question (e.g., "Cancel *my* booking").
- **General Conversation:** The AI will not engage in conversational chit-chat beyond its primary function.

### 1.3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-001 | User can navigate to a dedicated chat page from a new "AI Chat" tab in the main navigation. |
| FR-002 | The chat page will display a conversation history between the user and the AI. |
| FR-003 | The AI shall answer questions based on real-time application data. |
| FR-004 | The AI shall politely refuse to answer any out-of-scope questions. |
| FR-005 | The chat will span across user sessions for a user on the same device. |

---

## 2. Technical Specification

### 2.1. Frontend

1.  **New Component (`AIChatPage.tsx`):**
    *   A new file will be created at `client/src/pages/ai-chat.tsx`.
    *   This component will contain the full-screen chat UI, including the message display area and the text input form.
    *   It will manage the conversation history state (an array of message objects).

2.  **API Communication:**
    *   The component will use `react-query`'s `useMutation` hook to send user messages to the new backend endpoint.
    *   On a successful response, the AI's message will be added to the conversation history state, triggering a re-render.

3.  **Routing & Navigation:**
    *   The `TabNavigation.tsx` component will be modified to include the new "AI Chat" tab.
    *   The main page component (`home.tsx`) will be updated to render the new `AIChatPage` component when the "AI Chat" tab is active.

### 2.2. Backend

1.  **New Endpoint (`POST /api/ai/chat`):**
    *   A new route will be added to `server/routes.ts` to handle chat requests.
    *   This endpoint will accept a JSON body with the user's message, e.g., `{ "message": "Who is booked for today?" }`.

2.  **Intent Recognition (Keyword-based):**
    *   The backend service will perform simple keyword analysis on the user's message to determine the intent.
    *   **Example Logic:**
        *   If message contains "who", "when", "how many", "slots left" -> Intent: `query_bookings`.
        *   If message contains "participation", "most active", "stats" -> Intent: `query_participation`.
        *   If no keywords match, proceed to the LLM with no specific data context.

3.  **Data Retrieval (RAG):**
    *   Based on the recognized intent, the service will query the database using the Drizzle ORM.
    *   **Example:** For `query_bookings`, it will fetch all bookings for the relevant date range mentioned in the user's message.
    *   The retrieved data will be serialized into a clean JSON string to be injected into the prompt.

4.  **LLM Prompt Construction & API Call:**
    *   A detailed prompt will be constructed, combining:
        1.  **System Prompt:** A predefined set of instructions defining the AI's role and limitations (as described in the Business Requirements).
        2.  **Data Context:** The JSON string of data retrieved from the database (if any).
        3.  **User's Question:** The original message from the user.
    *   This complete prompt will be sent to an external Large Language Model API (e.g., Google's Gemini API).

5.  **Response Handling:**
    *   The text response from the LLM will be extracted.
    *   The endpoint will return the AI's response to the frontend, e.g., `{ "reply": "There are 4 slots left for today." }`.

### 2.3. Database

*   No database schema changes are required for this initial, query-only version of the feature.

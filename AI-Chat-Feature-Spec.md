# AI Chat Feature: Business Requirements & Technical Specification

This document outlines the plan for implementing an in-app AI assistant.

---

## 1. Business Requirements

### 1.1. Objective

To improve user engagement and efficiency by allowing users to ask questions about application data and (in a future phase) perform actions using a natural language chat interface.

### 1.2. Scope

#### In Scope:
- **Conversational Queries:** Users can ask questions about bookings, members, participation statistics, and activity patterns.
- **Contextual Awareness:** The AI assistant's knowledge is strictly limited to the data within this application.
- **Relevance Enforcement:** The AI must politely decline to answer any questions not related to the application.
- **UI Integration:** The feature will be accessible via a dedicated "AI Chat" tab in the main navigation.
- **Session Persistence:** Chat history will be saved on the user's device.

#### Out of Scope (for initial release):
- **Action-Oriented Commands:** The AI will not perform actions like booking or cancelling slots.
- **User-Specific Context:** The AI will not have memory of the specific user asking the question.

### 1.3. Functional Requirements

| ID | Requirement |
|---|---|
| FR-001 | User can navigate to a dedicated chat page from a new "AI Chat" tab. |
| FR-002 | The chat page will display a conversation history. |
| FR-003 | The AI shall answer questions based on real-time application data. |
| FR-004 | The AI shall politely refuse to answer any out-of-scope questions. |
| FR-005 | The chat will span across user sessions for a user on the same device. |
| FR-006 | The AI shall answer questions about member activity patterns (e.g., device usage, booking times). |

---

## 2. Technical Specification

### 2.1. Frontend

1.  **New Component (`AIChatPage.tsx`):** A new file at `client/src/pages/ai-chat.tsx` will contain the full-screen chat UI.
2.  **State Persistence (FR-005):** The component will use `localStorage` to save and load the conversation history, making it persistent across sessions.
3.  **API Communication:** A `useMutation` hook from `react-query` will send user messages to the backend.
4.  **Routing & Navigation:** `TabNavigation.tsx` and `home.tsx` will be updated to render the new `AIChatPage` component when the "AI Chat" tab is active.

### 2.2. Backend

1.  **New Endpoint (`POST /api/ai/chat`):** A new route in `server/routes.ts` will handle chat requests.

2.  **Intent Recognition (Keyword-based):** The service will analyze the user's message to determine intent.
    *   **`query_bookings`:** Triggered by "who", "when", "how many", "slots left".
    *   **`query_participation`:** Triggered by "participation", "stats".
    *   **`query_activity` (New):** Triggered by "most active", "iOS", "Android", "iPhone", "late night", "morning", "device".
    *   If no keywords match, proceed with no specific data context.

3.  **Data Retrieval (RAG):** Based on the intent, the service will query the database using Drizzle ORM.
    *   For the new **`query_activity`** intent, the backend will perform aggregation queries on the `activities` table.
    *   **Example 1 ("...on iOS?"):** `SELECT memberName, COUNT(*) FROM activities WHERE deviceInfo LIKE '%iOS%' GROUP BY memberName ORDER BY COUNT(*) DESC LIMIT 1;`
    *   **Example 2 ("...late nights?"):** `SELECT memberName, COUNT(*) FROM activities WHERE EXTRACT(HOUR FROM createdAt) >= 21 GROUP BY memberName ORDER BY COUNT(*) DESC LIMIT 1;`
    *   The retrieved data (e.g., the top member and their count) will be serialized into a JSON string for the prompt.

4.  **LLM Prompt Construction:** A detailed prompt will be constructed by combining the System Prompt, the Data Context, and the User's Question.

5.  **Relevance Enforcement & Guardrails (FR-004):** The primary mechanism is a **System Prompt** that is prepended to every request sent to the LLM.
    *   **Example System Prompt:**
        ```
        You are an AI assistant for the 'CourtReserve' application. Your ONLY purpose is to answer questions about member information, court bookings, participation statistics, and member activity patterns. Use badminton lingo wherever you can, keep it fun always because this is a group of friends who're playing for fun (though also competitive)

        **RULES:**
        - You MUST NOT answer any questions outside of this scope (e.g., weather, news, general knowledge).
        - If asked an irrelevant question, you MUST politely decline with a message like: 'I can only help with questions about CourtReserve. How can I assist with bookings or members today?'
        - Use ONLY the data provided in the 'Context' section to answer the user's question. Do not make up information.
        ```

6.  **Response Handling:** The text response from the LLM is extracted and returned to the frontend.

### 2.3. Database

*   No database schema changes are required for this feature.

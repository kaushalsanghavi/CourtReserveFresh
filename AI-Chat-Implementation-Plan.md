# AI Chat Feature: Implementation Plan

This document breaks down the development of the AI Chat feature into a checklist of tasks that can be checked off as they are completed.

---

## Phase 1: Backend Foundation

- [ ] **1.1: Create New API Route**
    - [ ] In `server/routes.ts`, add a new route for `/api/ai/chat`.
    - [ ] Create a new handler function for the `POST` method on this route.

- [ ] **1.2: Basic Request/Response Structure**
    - [ ] In the new handler, set up basic request validation to ensure a `message` field exists in the JSON body.
    - [ ] For initial testing, implement a simple echo response. The endpoint should return the user's message in a JSON object: `{ "reply": "You said: " + message }`.
    - [ ] Manually test the new endpoint using a tool like `curl` to ensure it's live and responding correctly.

---

## Phase 2: Frontend Scaffolding

- [ ] **2.1: Create the Chat Page Component**
    - [ ] Create a new file: `client/src/pages/AIChatPage.tsx`.
    - [ ] Add placeholder content, such as a `div` with the text "AI Chat Page", to make sure it renders.

- [ ] **2.2: Update Navigation and Routing**
    - [ ] In `client/src/components/TabNavigation.tsx`, add the "AI Chat" tab button to the navigation bar.
    - [ ] In `client/src/pages/home.tsx`, update the rendering logic to display the `<AIChatPage />` component when the "AI Chat" tab is active.
    - [ ] Run the app and manually test that clicking the "AI Chat" tab correctly displays the new placeholder page.

---

## Phase 3: Core AI Logic (Backend)

- [ ] **3.1: Implement System Prompt and LLM Boilerplate**
    - [ ] In a new constants file or at the top of the new AI route handler, store the approved System Prompt text.
    - [ ] Create a helper function that handles the API call to the external LLM (e.g., Gemini API). This function will take the full prompt string as input.
    - [ ] Update the `/api/ai/chat` endpoint to send the user's message (prepended with the system prompt) to the LLM and return the LLM's direct response. This temporarily bypasses intent recognition for testing the connection.

- [ ] **3.2: Implement Intent Recognition**
    - [ ] Create a function `recognizeIntent(message: string)`.
    - [ ] Inside this function, implement the keyword-based logic defined in the spec to return an intent type (e.g., `query_bookings`, `query_activity`, or `null`).

- [ ] **3.3: Implement Data Retrieval (RAG)**
    - [ ] Create a new function `getContextData(intent: string, message: string)`.
    - [ ] Inside this function, use a `switch` statement for the `intent`.
    - [ ] For each case, implement the corresponding database query using Drizzle ORM.
        - [ ] **Case `query_bookings`:** Fetch relevant bookings.
        - [ ] **Case `query_participation`:** Fetch participation stats.
        - [ ] **Case `query_activity`:** Implement the aggregation queries for device and time patterns.
    - [ ] The function should return the fetched data formatted as a JSON string.

- [ ] **3.4: Integrate RAG into Endpoint**
    - [ ] In the `/api/ai/chat` endpoint, call `recognizeIntent` on the user's message.
    - [ ] If an intent is found, call `getContextData` to get the relevant data.
    - [ ] Construct the final prompt by combining: `System Prompt + Context Data + User Message`.
    - [ ] Send the final, complete prompt to the LLM helper function.

---

## Phase 4: Frontend Implementation

- [ ] **4.1: Build Chat UI**
    - [ ] In `AIChatPage.tsx`, implement the chat message display area. This should map over a state array (e.g., `messages`) and render the conversation.
    - [ ] Style the user and AI chat bubbles differently for clarity.
    - [ ] Implement the chat input form (text input and send button).

- [ ] **4.2: Implement API Call**
    - [ ] Use the `useMutation` hook from `react-query` to handle calls to the `/api/ai/chat` endpoint.
    - [ ] When the user submits the input form, add their message to the `messages` state array and immediately trigger the mutation.
    - [ ] When the mutation is successful, add the AI's response object to the `messages` state array.

- [ ] **4.3: Implement Chat Persistence (FR-005)**
    - [ ] In `AIChatPage.tsx`, initialize the `messages` state by reading from `localStorage`. If `localStorage` is empty, initialize with a default welcome message.
    - [ ] Use a `useEffect` hook that triggers whenever the `messages` array changes, and save the updated array to `localStorage`.

---

## Phase 5: Testing & Refinement

- [ ] **5.1: Manual End-to-End Testing**
    - [ ] Test each question type defined in the spec and verify the AI provides a correct, context-aware answer.
        - [ ] Booking questions (e.g., "How many slots left for Friday?")
        - [ ] Activity questions (e.g., "Who is most active on iOS?")
    - [ ] Test irrelevant questions (e.g., "What's the weather?") and verify the AI politely declines as per the system prompt.
    - [ ] Test chat history persistence by sending messages, refreshing the page, and ensuring the conversation reappears.

Citation Handling Implementation Report

Backend (Python, Quart, CosmosDB)

Pattern:

For every assistant answer, the backend stores two messages in CosmosDB:
A "tool" message with role "tool" and content as a JSON string: {"citations": [...]} (the citations array).
An "assistant" message with the answer text.

Endpoints:

/history/update and /history/generate ensure that for each assistant response, a "tool" message (with citations, or an empty array if none) is written immediately before the "assistant" message.
/history/read returns all messages in order, including both "tool" and "assistant" messages.

Relevant Code:

In app.py, the /history/update endpoint:
Checks if the previous message is a "tool" message; if not, it creates an empty "tool" message.
Always writes the "tool" message before the "assistant" message.
Frontend (React, TypeScript)

Pattern:

When rendering chat history, the frontend looks for citations in the "tool" message immediately preceding each "assistant" message.
The citations are parsed from the "tool" message’s content and attached to the corresponding assistant answer for display.

Relevant Code:

In Chat.tsx:
The message rendering loop was patched so that for each "assistant" message, it checks if the previous message is a "tool" message and, if so, parses citations from it.
The citations are then passed to the answer component for robust, answer-tied citation display.

Result
The frontend now displays citations for each answer, as long as the backend stores them in the "tool" message.
This matches the official Contoso (microsoft/sample-app-aoai-chatGPT) pattern for citation storage and retrieval.
Any issues with citation content or accuracy are now likely due to upstream data or citation extraction logic, not the storage/display pipeline.

Next Steps:

If citation content is unrelated or incorrect, further investigation is needed into how citations are extracted and attached in the backend, or how the LLM and retrieval pipeline are configured.
This configuration and code pattern is now documented for future reference and troubleshooting.
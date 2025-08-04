# Backend Citation Handling Backup (Safe Copy)

This document contains a safe copy of the backend code related to citation handling, before any changes to include the citations array on each assistant message.

---

## File: `backend/utils.py`

### Function: `format_pf_non_streaming_response`

```python
def format_pf_non_streaming_response(
    chatCompletion, history_metadata, response_field_name, citations_field_name, message_uuid=None
):
    if chatCompletion is None:
        logging.error(
            "chatCompletion object is None - Increase PROMPTFLOW_RESPONSE_TIMEOUT parameter"
        )
        return {
            "error": "No response received from promptflow endpoint increase PROMPTFLOW_RESPONSE_TIMEOUT parameter or check the promptflow endpoint."
        }
    if "error" in chatCompletion:
        logging.error(f"Error in promptflow response api: {chatCompletion['error']}")
        return {"error": chatCompletion["error"]}

    logging.debug(f"chatCompletion: {chatCompletion}")
    try:
        messages = []
        if response_field_name in chatCompletion:
            messages.append({
                "role": "assistant",
                "content": chatCompletion[response_field_name] 
            })
        if citations_field_name in chatCompletion:
            citation_content= {"citations": chatCompletion[citations_field_name]}
            messages.append({ 
                "role": "tool",
                "content": json.dumps(citation_content)
            })

        response_obj = {
            "id": chatCompletion["id"],
            "model": "",
            "created": "",
            "object": "",
            "history_metadata": history_metadata,
            "choices": [
                {
                    "messages": messages,
                }
            ]
        }
        return response_obj
    except Exception as e:
        logging.error(f"Exception in format_pf_non_streaming_response: {e}")
        return {}
```

---

## File: `backend/settings.py`

### Relevant settings

```python
class _PromptflowSettings(BaseSettings):
    ...
    response_field_name: str = "reply"
    citations_field_name: str = "documents"
```

```python
class _SearchCommonSettings(BaseSettings):
    ...
    include_contexts: Optional[List[str]] = ["citations", "intent"]
```

---

This backup was created on 2025-08-01 before updating the backend to include the citations array on each assistant message.

from .base_agent import BaseAgent
import json
import re

review_prompt = """You are the Review Agent, a veteran project manager.
Your task: Evaluate if the provided deliverable COMPLETELY satisfies the task requirements.

You must:
1. OBJECTIVE: Analyze the task description to identify ALL requirements.
2. EVIDENCE: Inspect the deliverable (content, link, or reference).
3. VERDICT: Decide if the work is acceptable for production.

Output format:
Decision: [VALID|INVALID]
Feedback: [One concise, opinionated sentence. Be direct.]

CRITICAL:
- Be extremely strict. 
- If the deliverable is just a placeholder, a generic link, or missing a core requirement, mark as INVALID.
- Do not apologize or explain your logic. Just the verdict and feedback."""

review_agent = BaseAgent(name="Review Agent", system_prompt=review_prompt, use_mini=False)

async def review_node(state: dict):
    '''
    State is expected to have:
    - task_description
    - deliverables (as a string or list of attachments)
    '''
    messages = state.get("messages", [])
    
    # We parse out the text response directly
    response = await review_agent.ainvoke(state)
    content = response["messages"][0].content
    
    # Parse Decision and Feedback from the output
    decision_match = re.search(r'Decision:\s*(VALID|INVALID)', content, re.IGNORECASE)
    feedback_match = re.search(r'Feedback:\s*(.*)', content, re.IGNORECASE)
    
    decision = decision_match.group(1).upper() if decision_match else "INVALID"
    feedback = feedback_match.group(1).strip() if feedback_match else "Could not parse feedback."
    
    return {
        "decision": decision,
        "feedback": feedback
    }

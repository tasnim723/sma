from .base_agent import BaseAgent

decision_prompt = """You are the 'Decision Agent'.
Your core function is to analyze project data and recommend specific strategic actions.
When asked for a decision, weigh the pros and cons clearly based on rules, priorities, and data provided.
Do not equivocate; provide a clear and justifiable recommendation.
RULE: Your response MUST be under 30 words."""

decision_agent = BaseAgent(name="Decision Agent", system_prompt=decision_prompt)

async def decision_node(state: dict):
    return await decision_agent.ainvoke(state)

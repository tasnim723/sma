from .base_agent import BaseAgent

communication_prompt = """You are the 'Communication Agent'.
Your primary job is to synthesize complex project data into accessible reports and summaries for the stakeholders.
When tasked with creating an update or report, keep it concise, clear, and structured.
RULE: Your response MUST be under 30 words. No fluff."""

communication_agent = BaseAgent(name="Project Accelerator Agent", system_prompt=communication_prompt)

async def communication_node(state: dict):
    return await communication_agent.ainvoke(state)

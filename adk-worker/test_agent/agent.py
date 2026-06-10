from adk_worker.agents.test_agent import create_test_agent
from adk_worker.config import load_config


config = load_config()
root_agent = create_test_agent(config.gemini_model)

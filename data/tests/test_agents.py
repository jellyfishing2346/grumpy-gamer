def test_base_agent():
    from agents.base_agent import BaseAgent
    import pytest
    agent = BaseAgent()
    with pytest.raises(NotImplementedError):
        agent.solve(None)

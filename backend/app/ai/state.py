from typing import TypedDict, Optional, Dict, Any, List


class AgentState(TypedDict, total=False):
    input: str
    session_id: str
    action: Optional[str]
    parsed: Optional[Dict[str, Any]]
    result: Optional[Dict[str, Any]]
    messages: List[Any]

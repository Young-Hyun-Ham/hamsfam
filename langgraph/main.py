from langgraph.graph import StateGraph, END
from typing_extensions import TypedDict
from typing import List, Dict, Any


class EngineState(TypedDict, total=False):
    inputText: str
    trace: List[Dict[str, Any]]

print(f"[langgraph] start=======>")
g = StateGraph(EngineState)
#######################
# workflow definition
#######################
def set_input_text(value: str, node_name: str):
    def fn(state: EngineState) -> EngineState:
        state.setdefault("trace", []) # trace 초기화

        state["inputText"] = value
        state["trace"].append({"node": node_name, "value": value})
        return state
    return fn

g.add_node("start", set_input_text("Hello, LangGraph!", "start"))
g.add_node("end", set_input_text("Goodbye, LangGraph!", "end"))

g.set_entry_point("start")
g.add_edge("start", "end")
g.add_edge("end", END)

chain = g.compile()
final_state = chain.invoke({"inputText": "test!!"})

print("===================================================")
print("trace:")
for t in final_state.get("trace", []):
    print(t)
print("===================================================")
print("final_state:", final_state)
print("===================================================")
from __future__ import annotations
from typing import Any, Dict, List, Optional, Literal
from typing_extensions import TypedDict
from datetime import datetime
import re

from langgraph.graph import StateGraph, END


# ---------------------------
# Runtime State
# ---------------------------
class Awaiting(TypedDict, total=False):
    kind: Literal["slot", "branch"]
    nodeId: str
    slot: str
    next: str
    routes: Dict[str, str]  # value -> next node id (branch용)

class EngineState(TypedDict, total=False):
    inputText: str
    slots: Dict[str, Any]
    vars: Dict[str, Any]
    messages: List[Dict[str, Any]]
    trace: List[Dict[str, Any]]
    cursor: str
    next: str
    awaiting: Awaiting
    runId: str
    turn: int


# ---------------------------
# Builder schema (네가 준 형태)
# ---------------------------
class BuilderNode(TypedDict, total=False):
    id: str
    type: str
    data: Dict[str, Any]

class BuilderEdge(TypedDict, total=False):
    source: str
    target: str
    sourceHandle: Optional[str]


# ---------------------------
# helpers
# ---------------------------
def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _ensure_state(state: EngineState) -> None:
    state.setdefault("slots", {})
    state.setdefault("vars", {})
    state.setdefault("messages", [])
    state.setdefault("trace", [])

def _trace(state: EngineState, node_id: str, node_type: str, info: Dict[str, Any]) -> None:
    _ensure_state(state)
    state["trace"].append({"ts": now_iso(), "nodeId": node_id, "nodeType": node_type, **info})

def _msg(state: EngineState, role: str, content: str, meta: Optional[Dict[str, Any]] = None) -> None:
    _ensure_state(state)
    state["messages"].append({"ts": now_iso(), "role": role, "content": content, "meta": meta or {}})

def _outgoing(edges: List[BuilderEdge], source: str) -> List[BuilderEdge]:
    return [e for e in edges if e.get("source") == source]

def _incoming_count(edges: List[BuilderEdge], node_id: str) -> int:
    return sum(1 for e in edges if e.get("target") == node_id)

_TEMPLATE = re.compile(r"\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}")

def render_template(text: str, state: EngineState) -> str:
    slots = state.get("slots", {}) or {}
    vars_ = state.get("vars", {}) or {}

    def rep(m: re.Match) -> str:
        k = m.group(1)
        if k in slots:
            return str(slots.get(k, ""))
        if k in vars_:
            return str(vars_.get(k, ""))
        return ""

    return _TEMPLATE.sub(rep, text or "")


# ---------------------------
# Awaiting resume
# action: {type:"reply", value:"...", display:"..."}
# ---------------------------
def apply_action_if_awaiting(state: EngineState, action: Optional[Dict[str, Any]]) -> None:
    awaiting = state.get("awaiting")
    if not awaiting:
        return
    if not action:
        # 액션이 없으면 그대로 대기 유지
        return

    value = action.get("value")
    display = action.get("display")
    kind = awaiting.get("kind")

    if kind == "slot":
        slot_name = awaiting.get("slot")
        if slot_name:
            # ✅ value 저장
            state.setdefault("slots", {})[slot_name] = value
        # display는 meta 성격이니 vars에 “최근 표시값” 정도만 보관(원하면 제거 가능)
        state.setdefault("vars", {})["__last_display__"] = display
        # 다음 노드로 진행
        # state["next"] = awaiting.get("next", "__end__")
        # state.pop("awaiting", None)
        state["cursor"] = awaiting.get("next", "__end__") 
        state["next"] = state["cursor"]
        state.pop("awaiting", None)
        _trace(state, awaiting.get("nodeId", ""), "awaitingResolved", {"kind": "slot", "slot": slot_name, "value": value, "next": state["next"]})

    elif kind == "branch":
        routes = awaiting.get("routes") or {}
        picked = routes.get(value, "__end__")
        state.setdefault("vars", {})["__last_branch_value__"] = value
        state.setdefault("vars", {})["__last_display__"] = display
        # state["next"] = picked
        # state.pop("awaiting", None)
        state["cursor"] = picked
        state["next"] = picked
        state.pop("awaiting", None)
        _trace(state, awaiting.get("nodeId", ""), "awaitingResolved", {"kind": "branch", "value": value, "next": picked})


# ---------------------------
# Node handlers (builder types)
# ---------------------------
def make_builder_node_fn(node: BuilderNode, edges: List[BuilderEdge]):
    node_id = node["id"]
    node_type = node.get("type", "")
    data = node.get("data") or {}
    outgoing = _outgoing(edges, node_id)

    def default_next() -> str:
        if len(outgoing) >= 1:
            return outgoing[0]["target"]
        return "__end__"

    def fn(state: EngineState) -> EngineState:
        _ensure_state(state)

        if node_type == "message":
            content = render_template(str(data.get("content", "")), state)
            _msg(state, "assistant", content, meta={"nodeId": node_id, "type": "message"})
            # state["next"] = default_next()
            nxt = default_next()
            state["cursor"] = nxt if nxt != "__end__" else None  # ✅ 다음 위치 저장
            state["next"] = nxt
            _trace(state, node_id, "message", {"next": state["next"]})
            return state

        if node_type == "slotfilling":
            # 질문 + quickReplies 제공 후 대기
            replies = data.get("replies") or []
            slot_name = data.get("slot") or "slot"
            content = str(data.get("content", ""))

            # 템플릿에서 {{A}}, {{B}} 같은 걸 쓰고 싶으면 vars에 자동으로 깔아준다(표시용)
            # (여기서는 display를 vars에 넣어 message에서 {{A}}가 "A"로 치환되게 함)
            for r in replies:
                disp = r.get("display")
                if disp:
                    state.setdefault("vars", {})[disp] = disp

            _msg(
                state,
                "assistant",
                content,
                meta={"nodeId": node_id, "type": "slotfilling", "quickReplies": replies, "slot": slot_name},
            )

            # nxt = default_next()
            # state["awaiting"] = {"kind": "slot", "nodeId": node_id, "slot": slot_name, "next": nxt}
            # state["next"] = "__end__"  # 멈춤
            nxt = default_next()
            state["awaiting"] = {"kind": "slot", "nodeId": node_id, "slot": slot_name, "next": nxt}
            state["cursor"] = node_id
            state["next"] = "__end__"
            _trace(state, node_id, "slotfilling", {"awaiting": state["awaiting"]})
            return state

        if node_type == "branch":
            # BUTTON 분기: replies(value=condId)를 눌렀을 때 sourceHandle 매칭 edge로 라우팅
            replies = data.get("replies") or []
            content = str(data.get("content", ""))

            # routes 구성: value(=condId) -> target
            routes: Dict[str, str] = {}
            for e in outgoing:
                sh = e.get("sourceHandle")
                if sh:
                    routes[sh] = e["target"]

            _msg(
                state,
                "assistant",
                content,
                meta={"nodeId": node_id, "type": "branch", "quickReplies": replies},
            )
            # state["awaiting"] = {"kind": "branch", "nodeId": node_id, "routes": routes}
            # state["next"] = "__end__"
            state["awaiting"] = {"kind": "branch", "nodeId": node_id, "routes": routes}
            state["cursor"] = node_id
            state["next"] = "__end__"
            _trace(state, node_id, "branch", {"awaiting": {"kind": "branch", "routesCount": len(routes)}})
            return state

        # unknown -> end
        state["next"] = "__end__"
        _trace(state, node_id, "unknown", {"type": node_type})
        return state

    return fn


# ---------------------------
# Compile builder flow to LangGraph
# ---------------------------
def compile_builder_flow(nodes: List[BuilderNode], edges: List[BuilderEdge], start: str):
    g = StateGraph(EngineState)

    node_ids = [n["id"] for n in nodes]

    # ✅ router: cursor가 있으면 그 노드로, 없으면 start로 라우팅
    def router(state: EngineState) -> EngineState:
        _ensure_state(state)
        state["next"] = state.get("cursor") or start
        return state

    g.add_node("__router__", router)

    for n in nodes:
        g.add_node(n["id"], make_builder_node_fn(n, edges))

    # ✅ entry는 항상 router
    g.set_entry_point("__router__")

    # router -> (cursor가 가리키는 노드로)
    mapping_router: Dict[str, Any] = {nid: nid for nid in node_ids}
    mapping_router["__end__"] = END
    g.add_conditional_edges("__router__", lambda st: st.get("next", "__end__"), mapping_router)

    # 각 노드 -> 다음 노드(state["next"] 기반)
    for nid in node_ids:
        outs = _outgoing(edges, nid)
        mapping: Dict[str, Any] = {e["target"]: e["target"] for e in outs}
        mapping["__end__"] = END
        g.add_conditional_edges(nid, lambda st: st.get("next", "__end__"), mapping)

    return g.compile()


def pick_start_node(nodes: List[BuilderNode], edges: List[BuilderEdge]) -> str:
    # incoming이 0인 노드가 start
    for n in nodes:
        if _incoming_count(edges, n["id"]) == 0:
            return n["id"]
    # fallback
    return nodes[0]["id"]

import os, json
from collections import Counter
from typing import Any, Dict, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUN_EVENTS_FILE = os.path.join(BASE_DIR, "run_events.jsonl")
RUN_TRACE_FILE = os.path.join(BASE_DIR, "run_trace.jsonl")  # optional

def _append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

def _turn_trace_slice(state: EngineState, start_len: int) -> List[Dict[str, Any]]:
    tr = state.get("trace") or []
    return tr[start_len:] if start_len < len(tr) else []

def run_builder_flow(
    nodes: List[BuilderNode],
    edges: List[BuilderEdge],
    input_text: str,
    prev_state: Optional[EngineState] = None,
    action: Optional[Dict[str, Any]] = None,
) -> EngineState:
    start = pick_start_node(nodes, edges)
    app = compile_builder_flow(nodes, edges, start)

    state: EngineState = prev_state or {}
    state["inputText"] = input_text or ""
    state["turn"] = int(state.get("turn") or 0) + 1
    trace_start_len = len(state.get("trace") or [])

    _ensure_state(state)

    # user message는 action이 없을 때만 기록(버튼 클릭은 action으로 보기)
    if input_text:
        _msg(state, "user", input_text, meta={"source": "input"})

    # awaiting 상태면 action으로 먼저 해소
    apply_action_if_awaiting(state, action)

    out = app.invoke(state)

    # ---------- 저장(엔진 책임) ----------
    turn_trace = _turn_trace_slice(out, trace_start_len)

    # trace 저장
    for i, t in enumerate(turn_trace, start=1):
        _append_jsonl(RUN_TRACE_FILE, {
            "ts": t.get("ts"),
            "runId": out.get("runId"),
            "turn": out.get("turn"),
            "stepInTurn": i,
            "nodeId": t.get("nodeId"),
            "nodeType": t.get("nodeType"),
            "awaiting": out.get("awaiting") or None,
            "info": {k: v for k, v in t.items() if k not in ("ts", "nodeId", "nodeType")}
        })

    # events 저장
    awaiting = out.get("awaiting") or None
    counts = Counter((t.get("nodeType") or "unknown") for t in turn_trace)

    ended = (out.get("next") == "__end__") or (out.get("cursor") is None and not awaiting)

    _append_jsonl(RUN_EVENTS_FILE, {
        "ts": now_iso(),
        "scenarioId": out.get("vars", {}).get("__scenarioId__") or "builder-sample",
        "runId": out.get("runId"),
        "turn": out.get("turn"),
        "steps": len(turn_trace),
        "awaitingKind": (awaiting or {}).get("kind") if awaiting else None,
        "awaitingNodeId": (awaiting or {}).get("nodeId") if awaiting else None,
        "slots": out.get("slots") or {},
        "branchPicked": out.get("vars", {}).get("__branchPicked__") or {},
        "ended": bool(ended),

        # ✅ message 통계도 여기서 바로 뽑힘
        "executedCountsByType": dict(counts),
    })
    # ------------------------------------

    return out

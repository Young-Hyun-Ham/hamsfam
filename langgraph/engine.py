from __future__ import annotations
from typing import Any, Dict, List, Optional, Literal
from typing_extensions import TypedDict
from datetime import datetime
import re

from langgraph.graph import StateGraph, END


# ---------------------------
# Runtime State (프론트가 state를 그대로 들고 있다가 다음 턴에 다시 보내는 구조)
# ---------------------------
class Awaiting(TypedDict, total=False):
    # 현재 "사용자 입력을 기다리는 상태"인지 여부
    kind: Literal["slot", "branch"]

    # 어떤 노드에서 멈췄는지(프론트에서 UI 표시할 때 유용)
    nodeId: str

    # slot 대기일 때: 저장해야 할 슬롯 키
    slot: str

    # slot 대기일 때: 사용자가 응답하면 이어서 갈 다음 노드
    next: str

    # branch 대기일 때: 사용자가 고른 value -> 다음 노드ID 매핑
    routes: Dict[str, str]


class EngineState(TypedDict, total=False):
    inputText: str

    # slot 값 저장소: 템플릿 {{data}} 같은 치환에 사용
    slots: Dict[str, Any]

    # 기타 변수 저장소: UI용 메타나 템플릿 표시 보조값
    vars: Dict[str, Any]

    # 프론트로 내려줄 채팅 메시지 목록
    messages: List[Dict[str, Any]]

    # 실행 trace(노드 실행 기록). stats/event도 여기서 파생 가능
    trace: List[Dict[str, Any]]

    # "다음에 실행할 노드 위치" (resume 핵심)
    cursor: str

    # LangGraph conditional edge가 참조할 이번 step의 다음 목적지
    next: str

    # 대기 상태(있으면 이번 턴에서 멈춰야 함)
    awaiting: Awaiting

    runId: str
    turn: int


# ---------------------------
# Builder schema (ReactFlow에서 내려오는 node/edge 형태)
# ---------------------------
class BuilderNode(TypedDict, total=False):
    id: str
    type: str
    data: Dict[str, Any]

class BuilderEdge(TypedDict, total=False):
    source: str
    target: str
    sourceHandle: Optional[str]  # branch에서 condId 등이 들어감


# ---------------------------
# helpers: state/messages/trace 공통 유틸
# ---------------------------
def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _ensure_state(state: EngineState) -> None:
    # state가 부분적으로만 들어와도 안전하게 동작하도록 기본값 보장
    state.setdefault("slots", {})
    state.setdefault("vars", {})
    state.setdefault("messages", [])
    state.setdefault("trace", [])

def _trace(state: EngineState, node_id: str, node_type: str, info: Dict[str, Any]) -> None:
    # trace는 "엔진 내부 실행 과정" 로그
    _ensure_state(state)
    state["trace"].append({"ts": now_iso(), "nodeId": node_id, "nodeType": node_type, **info})

def _msg(state: EngineState, role: str, content: str, meta: Optional[Dict[str, Any]] = None) -> None:
    # messages는 "프론트 UI에 렌더링될 채팅 로그"
    _ensure_state(state)
    state["messages"].append({"ts": now_iso(), "role": role, "content": content, "meta": meta or {}})

def _outgoing(edges: List[BuilderEdge], source: str) -> List[BuilderEdge]:
    return [e for e in edges if e.get("source") == source]

def _incoming_count(edges: List[BuilderEdge], node_id: str) -> int:
    return sum(1 for e in edges if e.get("target") == node_id)


# ---------------------------
# 템플릿 치환: "A: {{A}}" / "data: {{data}}" 같은 포맷을 slots/vars에서 치환
# ---------------------------
_TEMPLATE = re.compile(r"\{\{\s*([a-zA-Z0-9_\-]+)\s*\}\}")

def render_template(text: str, state: EngineState) -> str:
    slots = state.get("slots", {}) or {}
    vars_ = state.get("vars", {}) or {}

    def rep(m: re.Match) -> str:
        k = m.group(1)
        # slots 우선, 없으면 vars, 그것도 없으면 빈 문자열
        if k in slots:
            return str(slots.get(k, ""))
        if k in vars_:
            return str(vars_.get(k, ""))
        return ""

    return _TEMPLATE.sub(rep, text or "")


# ---------------------------
# awaiting이 있으면 action으로 먼저 해소 (resume)
# action: {type:"reply", value:"...", display:"..."}
# ---------------------------
def apply_action_if_awaiting(state: EngineState, action: Optional[Dict[str, Any]]) -> None:
    awaiting = state.get("awaiting")
    if not awaiting:
        return

    # action이 없으면 계속 대기 유지(= 사용자 응답 안 옴)
    if not action:
        return

    value = action.get("value")
    display = action.get("display")
    kind = awaiting.get("kind")

    if kind == "slot":
        slot_name = awaiting.get("slot")
        if slot_name:
            # 사용자가 고른 값(value)을 슬롯에 저장
            state.setdefault("slots", {})[slot_name] = value

        # display는 UI용(버튼 라벨 등) 메타. 필요 없으면 제거 가능
        state.setdefault("vars", {})["__last_display__"] = display

        # 대기를 해소했으니 다음 노드로 이동해야 함:
        #   cursor를 awaiting.next로 옮기고 awaiting 제거
        state["cursor"] = awaiting.get("next", "__end__")
        state["next"] = state["cursor"]
        state.pop("awaiting", None)

        _trace(state, awaiting.get("nodeId", ""), "awaitingResolved", {
            "kind": "slot",
            "slot": slot_name,
            "value": value,
            "next": state["next"],
        })

    elif kind == "branch":
        routes = awaiting.get("routes") or {}
        # 사용자가 고른 value(=condId)에 해당하는 다음 노드로 이동
        picked = routes.get(value, "__end__")

        state.setdefault("vars", {})["__last_branch_value__"] = value
        state.setdefault("vars", {})["__last_display__"] = display

        state["cursor"] = picked
        state["next"] = picked
        state.pop("awaiting", None)

        _trace(state, awaiting.get("nodeId", ""), "awaitingResolved", {
            "kind": "branch",
            "value": value,
            "next": picked,
        })


# ---------------------------
# 노드 타입별 실행 함수 생성 (builder node -> runtime handler)
# ---------------------------
def make_builder_node_fn(node: BuilderNode, edges: List[BuilderEdge]):
    node_id = node["id"]
    node_type = node.get("type", "")
    data = node.get("data") or {}
    outgoing = _outgoing(edges, node_id)

    def default_next() -> str:
        # 일반 노드는 outgoing 첫 번째를 기본 next로 사용(단일 플로우 가정)
        if len(outgoing) >= 1:
            return outgoing[0]["target"]
        return "__end__"

    def fn(state: EngineState) -> EngineState:
        _ensure_state(state)

        # ---------------------------
        # 1) message 노드: 메시지 출력하고 다음 노드로 cursor 이동
        # ---------------------------
        if node_type == "message":
            content = render_template(str(data.get("content", "")), state)
            _msg(state, "assistant", content, meta={"nodeId": node_id, "type": "message"})

            nxt = default_next()

            # 다음 실행 위치를 저장 (resume의 핵심)
            # end면 cursor를 None 처리(종료로 해석하기 좋게)
            state["cursor"] = nxt if nxt != "__end__" else None
            state["next"] = nxt

            _trace(state, node_id, "message", {"next": state["next"]})
            return state

        # ---------------------------
        # 2) slotfilling 노드: 질문+퀵리플라이 출력 후 "대기(awaiting)"로 멈춤
        # ---------------------------
        if node_type == "slotfilling":
            replies = data.get("replies") or []
            slot_name = data.get("slot") or "slot"
            content = str(data.get("content", ""))

            # 표시용 템플릿 치환을 위해 A/B 같은 display를 vars에 심어둠
            # 예: message에서 "A: {{A}}"가 그대로 "A"로 치환되게
            for r in replies:
                disp = r.get("display")
                if disp:
                    state.setdefault("vars", {})[disp] = disp

            _msg(
                state,
                "assistant",
                content,
                meta={
                    "nodeId": node_id,
                    "type": "slotfilling",
                    "quickReplies": replies,
                    "slot": slot_name,
                },
            )

            # slot 응답이 오면 이어갈 다음 노드
            nxt = default_next()

            # awaiting을 걸어두고, 이번 턴 실행은 여기서 "정지"시킴
            state["awaiting"] = {"kind": "slot", "nodeId": node_id, "slot": slot_name, "next": nxt}

            # cursor를 자기 자신으로 유지(“현재 질문 노드에서 멈춘 상태” 표시용)
            state["cursor"] = node_id

            # graph 상에서 더 진행하지 않도록 next를 "__end__"로 둔다
            state["next"] = "__end__"

            _trace(state, node_id, "slotfilling", {"awaiting": state["awaiting"]})
            return state

        # ---------------------------
        # 3) branch 노드: 버튼 선택 대기 (value=condId, edge.sourceHandle과 매핑)
        # ---------------------------
        if node_type == "branch":
            replies = data.get("replies") or []
            content = str(data.get("content", ""))

            # routes: sourceHandle(=condId) -> 다음 target 노드
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

            # awaiting으로 대기
            state["awaiting"] = {"kind": "branch", "nodeId": node_id, "routes": routes}
            state["cursor"] = node_id
            state["next"] = "__end__"

            _trace(state, node_id, "branch", {"awaiting": {"kind": "branch", "routesCount": len(routes)}})
            return state

        # ---------------------------
        # 4) 알 수 없는 노드 타입: 종료
        # ---------------------------
        state["next"] = "__end__"
        _trace(state, node_id, "unknown", {"type": node_type})
        return state

    return fn

from IPython.display import Image, display
# ---------------------------
# Builder Flow -> LangGraph Compile
# 핵심 포인트: "__router__" 노드를 entry로 두고 cursor 기반 라우팅을 수행
# ---------------------------
def compile_builder_flow(nodes: List[BuilderNode], edges: List[BuilderEdge], start: str):
    g = StateGraph(EngineState)
    node_ids = [n["id"] for n in nodes]
    print(f"==============> node_ids: {node_ids}")
    # router 노드:
    # - cursor가 있으면 그 노드로 재개
    # - cursor가 없으면 start부터 시작
    def router(state: EngineState) -> EngineState:
        print(f"[router] state.cursor=============> {state}")
        _ensure_state(state)
        state["next"] = state.get("cursor") or start
        return state

    g.add_node("__router__", router)

    # builder 노드들을 모두 graph node로 등록
    for n in nodes:
        g.add_node(n["id"], make_builder_node_fn(n, edges))

    # entry는 항상 router
    g.set_entry_point("__router__")

    # router -> next 값에 따라 실제 노드로 이동
    mapping_router: Dict[str, Any] = {nid: nid for nid in node_ids}
    mapping_router["__end__"] = END
    g.add_conditional_edges("__router__", lambda st: st.get("next", "__end__"), mapping_router)
    
    # 각 노드 실행 후 -> state["next"] 기준으로 다음 노드로 이동
    # (slotfilling/branch는 next="__end__"이므로 그 턴에서 멈춤)
    for nid in node_ids:
        outs = _outgoing(edges, nid)
        mapping: Dict[str, Any] = {e["target"]: e["target"] for e in outs}
        mapping["__end__"] = END
        g.add_conditional_edges(nid, lambda st: st.get("next", "__end__"), mapping)

    chain = g.compile()
    print(f"[compile_builder_flow] chain graph=============> {chain.get_graph().draw_mermaid()}")
    # display(Image(chain.get_graph().draw_mermaid_png()))

    print_builder_flow(chain)
        
    return chain

def print_builder_flow(chain: any) -> None:
    graph = chain.get_graph()

    # print("===== MERMAID =====")
    # print(graph.draw_mermaid())

    print("===== NODES =====")
    # graph.nodes가 list/set/dict 등일 수 있어서 안전하게 처리
    nodes = getattr(graph, "nodes", None)
    if isinstance(nodes, dict):
        for nid in nodes.keys():
            print(nid)
    elif isinstance(nodes, (list, set, tuple)):
        for nid in nodes:
            print(nid)
    else:
        print("graph.nodes 형태를 알 수 없음:", type(nodes))

    print("===== EDGES =====")
    edges = getattr(graph, "edges", None)

    if isinstance(edges, dict):
        # dict: src -> targets
        for src, targets in edges.items():
            print(src, "->", targets)

    elif isinstance(edges, (list, tuple, set)):
        # list: [("A","B"), ...] 또는 [EdgeObj, ...]
        for e in edges:
            if isinstance(e, (list, tuple)) and len(e) >= 2:
                print(e[0], "->", e[1])
            elif hasattr(e, "source") and hasattr(e, "target"):
                print(getattr(e, "source"), "->", getattr(e, "target"))
            elif hasattr(e, "src") and hasattr(e, "dst"):
                print(getattr(e, "src"), "->", getattr(e, "dst"))
            else:
                print("edge:", e)

    else:
        print("graph.edges 형태를 알 수 없음:", type(edges))


def pick_start_node(nodes: List[BuilderNode], edges: List[BuilderEdge]) -> str:
    print(f"start node ===================>")
    # incoming이 0인 노드가 시작 노드
    for n in nodes:
        if _incoming_count(edges, n["id"]) == 0:
            print(f"start node ===================> {n["id"]}")
            return n["id"]
        
    print(f"start node ===================> { nodes[0]["id"]} ")
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


import json, hashlib
from typing import Tuple, Any, Dict

_APP_CACHE: Dict[str, Any] = {}

def _stable_hash(nodes, edges) -> str:
    # 순서가 바뀌어도 같은 그래프로 인식되게 정렬/정규화
    payload = {
        "nodes": sorted(nodes, key=lambda n: n.get("id","")),
        "edges": sorted(edges, key=lambda e: (e.get("source",""), e.get("sourceHandle") or "", e.get("target",""))),
    }
    s = json.dumps(payload, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def get_compiled_app(nodes, edges):
    key = _stable_hash(nodes, edges)
    app = _APP_CACHE.get(key)
    if app is None:
        start = pick_start_node(nodes, edges)
        app = compile_builder_flow(nodes, edges, start)
        _APP_CACHE[key] = app
    return app

def run_builder_flow(
    nodes: List[BuilderNode],
    edges: List[BuilderEdge],
    input_text: str,
    prev_state: Optional[EngineState] = None,
    action: Optional[Dict[str, Any]] = None,
) -> EngineState:
    # start = pick_start_node(nodes, edges)
    # app = compile_builder_flow(nodes, edges, start)
    app = get_compiled_app(nodes, edges)

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
    print(f"[run_builder_flow] state after apply_action_if_awaiting=============> {state}")
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

        # message 통계도 여기서 바로 뽑힘
        "executedCountsByType": dict(counts),
    })
    # ------------------------------------

    return out

from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Query
from pydantic import BaseModel

from engine import EngineState, run_builder_flow

import json, uuid
from pathlib import Path
from datetime import datetime, timezone

app = FastAPI(title="Scenario Engine (LangGraph)")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- builder request types ----
class RunAction(BaseModel):
    type: str = "reply"          # reply
    value: str                  # 저장할 값
    display: Optional[str] = "" # meta용
    
class RunScenarioReq(BaseModel):
    userId: str
    scenarioId: Optional[str] = None
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    text: str = ""
    state: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None  # {type,value,display}

@app.get("/health")
def health():
    return {"ok": True}


EVENT_FILE = Path(__file__).with_name("run_events.jsonl")    # event 전용 파일

def utc_iso():
    return datetime.now(timezone.utc).isoformat()

def append_event(evt: dict):
    EVENT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with EVENT_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(evt, ensure_ascii=False) + "\n")

# from langgraph.graph import StateGraph, END
# from typing_extensions import TypedDict
# class EngineState(TypedDict, total=False):
#     inputText: str
#     runId: str
#     userId: str
#     scenarioId: str

# @app.post("/langgraphTest")
# def langgraph_test(req: RunScenarioReq):
#     run_id = (req.state or {}).get("runId") or str(uuid.uuid4())
#     print(f"[langgraphTest] runId=============> {run_id, req.userId, req.scenarioId}")

#     g = StateGraph(EngineState)
#     ####################
#     # workflow
#     ####################
#     g.add_nodes("workflow")

#     first = req.nodes[0]["id"]
#     g.set_entry_point(first)

#     g.add_edge(req.nodes[-1]["id"], END)

#     chain = g.compile()
#     print("chain nodes:", chain.nodes)
#     print("===================================================")
#     final_state = chain.invoke({})
#     print("final_state:", final_state)

#     return {"ok": True, "message": "LangGraph", "runId": run_id}
        
@app.post("/runScenario")
def run_scenario_api(req: RunScenarioReq):
    run_id = (req.state or {}).get("runId") or str(uuid.uuid4())
    # print(f"[runScenario] runId=============> {run_id}")
    # print(f"[runScenario] req.nodes=============> {req.nodes}")
    # print(f"[runScenario] req.edges=============> {req.edges}")
    # 실행
    out: EngineState = run_builder_flow(
        user_id=req.userId,
        nodes=req.nodes,
        edges=req.edges,
        input_text=req.text,
        prev_state=req.state,
        action=req.action,
    )
    # print(f"[runScenario] out=============> {out}")
    trace = out.get("trace", []) or []
    slots = out.get("slots", {}) or {}
    awaiting = out.get("awaiting")

    # branch 선택 집계: awaitingResolved(kind=branch)에서 next/ value
    branchPicked = {}
    for t in trace:
        if t.get("nodeType") == "awaitingResolved" and t.get("kind") == "branch":
            branchPicked[t.get("nodeId", "branch")] = t.get("value")

    # 이벤트 기록
    scenario_id = (
        req.scenarioId
        or (req.state or {}).get("scenarioId")
        or "unknown"
    )

    evt = {
        "ts": utc_iso(),
        "userId": req.userId,
        "scenarioId": scenario_id,
        "runId": run_id,
        "turn": int(out.get("turn", 0) or 0),
        "steps": len(trace),
        "awaitingKind": (awaiting or {}).get("kind") if awaiting else None,
        "awaitingNodeId": (awaiting or {}).get("nodeId") if awaiting else None,
        "slots": slots,
        "branchPicked": branchPicked,
        "ended": True if not awaiting else False,
    }
    append_event(evt)
    # --------------------------------------------------------------------------------------

    return {
        "ok": True,
        "runId": run_id,
        "messages": out.get("messages", []),
        "slots": slots,
        "vars": out.get("vars", {}),
        "trace": trace,
        "awaiting": awaiting,   # 프론트가 버튼 렌더/대기 판단
        "state": out,           # 다음 요청에 그대로 넣어서 이어가기
    }

from datetime import datetime, timezone
@app.get("/stats/summary")
def stats_summary(
    scenarioId: str = Query("builder-sample"),
    fromTs: str = Query(None),
    toTs: str = Query(None),
    date: str = Query(None),
):
    if not EVENT_FILE.exists():
        return {
            "ok": True,
            "scenarioId": scenarioId,
            "totalRuns": 0,
            "completedRuns": 0,
            "dropoff": {"slot": 0, "branch": 0},
            "slotDist": {},
            "branchDist": {},
            "avgTurns": 0,
            "avgSteps": 0,
            "byDay": [],
        }

    def in_range(ts: str) -> bool:
        if not fromTs and not toTs:
            return True
        if fromTs and ts < fromTs:
            return False
        if toTs and ts > toTs:
            return False
        return True

    # runId -> run aggregate
    runs = {}
    # runs[runId] = {
    #   "lastTs": "...",
    #   "lastTurn": int,
    #   "totalSteps": int,
    #   "lastAwaitingKind": "slot"|"branch"|None,
    #   "slotData": "1"|"2"|None,
    #   "branchPicked": {"branchNodeId": "cond_xxx"} (optional),
    # }

    with EVENT_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            evt = json.loads(line)

            if evt.get("scenarioId") != scenarioId:
                continue

            ts = evt.get("ts", "")
            if not in_range(ts):
                continue

            runId = evt.get("runId")
            if not runId:
                continue

            r = runs.get(runId)
            if not r:
                r = {
                    "lastTs": ts,
                    "lastTurn": int(evt.get("turn", 0) or 0),
                    "totalSteps": int(evt.get("steps", 0) or 0),
                    "lastAwaitingKind": evt.get("awaitingKind"),
                    "slotData": (evt.get("slots") or {}).get("data"),
                    "branchPicked": evt.get("branchPicked") or {},
                }
                runs[runId] = r
            else:
                # lastTs/lastTurn 갱신
                turn = int(evt.get("turn", 0) or 0)
                if ts >= r["lastTs"]:
                    r["lastTs"] = ts
                    r["lastTurn"] = max(r["lastTurn"], turn)
                    r["lastAwaitingKind"] = evt.get("awaitingKind")
                    # 마지막 상태의 슬롯 값으로 갱신
                    r["slotData"] = (evt.get("slots") or {}).get("data") or r["slotData"]
                    # branchPicked 누적/갱신
                    bp = evt.get("branchPicked") or {}
                    if bp:
                        r["branchPicked"].update(bp)

                # steps는 turn마다 trace 전체 길이를 쓰는 경우가 있어 누적이 애매함
                # 여기서는 "turn별 steps"가 누적이라 가정하고 합산.
                r["totalSteps"] += int(evt.get("steps", 0) or 0)

    total_runs = len(runs)

    # completed 정의: 마지막 awaitingKind가 None이면 완료(더 이상 대기 없음)
    completed_runs = 0
    drop_slot = 0
    drop_branch = 0

    slot_dist = {}    # "1" -> count
    branch_dist = {}  # "cond_xxx" -> count (여기선 단일 branch 기준)
    by_day = {}       # day -> completed run count
    turns_sum = 0
    steps_sum = 0

    for runId, r in runs.items():
        turns_sum += int(r["lastTurn"] or 0)
        steps_sum += int(r["totalSteps"] or 0)

        kind = r.get("lastAwaitingKind")
        if kind is None:
            completed_runs += 1
            day = (r.get("lastTs") or "")[:10]
            if day:
                by_day[day] = by_day.get(day, 0) + 1
        elif kind == "slot":
            drop_slot += 1
        elif kind == "branch":
            drop_branch += 1

        d = r.get("slotData")
        if d is not None:
            slot_dist[str(d)] = slot_dist.get(str(d), 0) + 1

        # branchPicked는 {"branchNodeId": "condId"} 형태일 수 있음
        bp = r.get("branchPicked") or {}
        for _, cond_id in bp.items():
            if cond_id:
                branch_dist[str(cond_id)] = branch_dist.get(str(cond_id), 0) + 1

    by_day_list = [{"day": k, "runs": v} for k, v in sorted(by_day.items())]

    avg_turns = (turns_sum / total_runs) if total_runs else 0.0
    avg_steps = (steps_sum / total_runs) if total_runs else 0.0

    def _today_ymd_utc():
      return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    target_day = date or _today_ymd_utc()

    # ✅ 완료된 run의 lastTs를 기준으로 시간대별 집계
    hour_buckets = [0] * 24
    for runId, r in runs.items():
        kind = r.get("lastAwaitingKind")
        if kind is not None:
            continue  # 완료(run)만 집계
        ts = r.get("lastTs", "")
        if not ts.startswith(target_day):
            continue

        # ts는 isoformat: "2025-12-22T06:57:48.230921Z" 또는 +00:00일 수 있음
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            hour_buckets[dt.hour] += 1
        except Exception:
            pass

    by_hour = [{"hour": h, "runs": hour_buckets[h]} for h in range(24)]

    return {
        "ok": True,
        "scenarioId": scenarioId,
        "totalRuns": total_runs,
        "completedRuns": completed_runs,
        "dropoff": {"slot": drop_slot, "branch": drop_branch},
        "slotDist": slot_dist,
        "branchDist": branch_dist,
        "avgTurns": avg_turns,
        "avgSteps": avg_steps,
        "byDay": by_day_list,
        "byHour": by_hour,
        "targetDay": target_day,
    }

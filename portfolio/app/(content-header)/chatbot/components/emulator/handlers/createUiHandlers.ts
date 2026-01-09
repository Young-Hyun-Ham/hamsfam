// app/(content-header)/chatbot/components/emulator/handlers/createUiHandlers.ts
import type { AnyNode } from "../../../types";
import { makeStepId } from "../../../utils";
import { findNextNode } from "../core/graph";

export function createUiHandlers(deps: {
  // graph
  nodes: AnyNode[];
  edges: any[];

  // state
  currentNode: AnyNode | null;
  setCurrentNodeId: (v: string | null) => void;
  setFinished: (v: boolean) => void;

  // values
  formValues: Record<string, any>;
  setSlotValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;

  // step pushers
  pushBotStep: (id: string, text: string) => void;
  pushUserStep: (id: string, text: string) => void;

  // engine
  logToEngine: (payload: any, params: any) => void;
  engineProps: any;
}) {
  const {
    nodes,
    edges,
    currentNode,
    setCurrentNodeId,
    setFinished,
    formValues,
    setSlotValues,
    pushBotStep,
    pushUserStep,
    logToEngine,
    engineProps,
  } = deps;

  const handleContinueFromMessage = () => {
    if (!currentNode) return;

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    // ✅ message만 즉시 출력 (form/branch/link/iframe/slotfilling은 autoRunner가 진입 시 1회 출력)
    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }
  };

  const handleContinueFromLlm = () => {
    if (!currentNode) return;

    const next =
      findNextNode(nodes, edges, currentNode.id, "default") ||
      findNextNode(nodes, edges, currentNode.id, null);

    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine({ action: { type: "reply", value: "continue", display: "continue" } }, engineProps);
  };

  const handleBranchClick = (reply: { display: string; value: string }) => {
    if (!currentNode) return;

    pushUserStep(makeStepId(`${currentNode.id}-${reply.value}`), reply.display);

    const next = findNextNode(nodes, edges, currentNode.id, reply.value);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    // ✅ message만 즉시 출력
    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine(
      { action: { type: "reply", value: reply.value, display: reply.display } },
      engineProps,
    );
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentNode) return;

    const elements: any[] = currentNode.data?.elements ?? [];
    const summaryParts: string[] = [];

    const formSlotKey: string | undefined = currentNode.data?.slotKey;
    const formObject: Record<string, any> = {};

    const formatAny = (v: any): string => {
      if (v === null || v === undefined) return "";
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    };

    for (const el of elements) {
      const value = formValues[el.name];

      if (value !== undefined && value !== null && value !== "") {
        formObject[el.name] = value;
      }

      // grid는 요약 메시지에서 제외(현 동작 유지)
      if (el?.type === "grid") continue;

      if (value === undefined || value === null || value === "") continue;
      const label = el.label || el.name;
      summaryParts.push(`${label}: ${formatAny(value)}`);
    }

    if (formSlotKey) {
      setSlotValues((prev: any) => {
        const prevFormSlot = prev?.[formSlotKey] ?? {};
        return {
          ...prev,
          [formSlotKey]: {
            ...prevFormSlot,
            ...formObject,
          },
        };
      });
    }

    // grid 선택값을 top-level 슬롯(selectedRow)로 저장 (grid element name 자동 탐지)
		const gridEl = elements.find((el) => el?.type === "grid");
		const gridName: string | undefined = gridEl?.name;

		// grid 값은 대부분 formValues[gridName]에 들어있음
		const gridValue =
			(gridName ? formValues[gridName] : undefined) ??
			formValues.selectedRow ??
			formObject.selectedRow;
		
		const selectedRow =
			gridValue === undefined
				? undefined
				: typeof gridValue === "string" || typeof gridValue === "number"
					? { id: gridValue }
					: gridValue;

		const selectedRowId = selectedRow ? (selectedRow as any)?.id : undefined;

		// ✅ slotValues 업데이트는 1회로 통합 (top-level + formSlotKey 아래 동시 저장)
		setSlotValues((prev: any) => {
			const next = { ...prev };

			// 1) 폼 slotKey 아래 저장(기존 formObject 유지 + selectedRow/Id 추가)
			if (formSlotKey) {
				const prevFormSlot = next?.[formSlotKey] ?? {};
				next[formSlotKey] = {
					...prevFormSlot,
					...formObject,
					...(selectedRow !== undefined ? { selectedRow } : {}),
					...(selectedRowId !== undefined ? { selectedRowId } : {}),
				};
			}

			// 2) top-level에도 저장(템플릿 치환용)
			if (selectedRow !== undefined) next.selectedRow = selectedRow;
			if (selectedRowId !== undefined) next.selectedRowId = selectedRowId;

			return next;
		});

    pushUserStep(
      makeStepId(`${currentNode.id}-form`),
      summaryParts.length > 0 ? summaryParts.join("\n") : "폼을 제출했습니다.",
    );

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    // ✅ message만 즉시 출력 (link/form/branch 등은 autoRunner가 진입 시 1회 출력)
    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine({ action: { type: "reply", value: formValues, display: "form" } }, engineProps);
  };

  const handleNextFromLink = () => {
    if (!currentNode) return;

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    // ✅ message만 즉시 출력
    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine({ action: { type: "reply", value: "continue", display: "continue" } }, engineProps);
  };

  const handleContinueFromIframe = () => {
    if (!currentNode) return;

    const next = findNextNode(nodes, edges, currentNode.id, null);
    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    // ✅ message만 즉시 출력
    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine({ action: { type: "reply", value: "continue", display: "continue" } }, engineProps);
  };

  const handleSlotFillingClick = (reply: { display: string; value: any }) => {
    if (!currentNode) return;

    const slotName: string = currentNode.data?.slot ?? currentNode.data?.slotName ?? "";
    if (slotName) setSlotValues((prev) => ({ ...prev, [slotName]: reply.value }));

    const handle = String(reply.value);
    const next =
      findNextNode(nodes, edges, currentNode.id, handle) ||
      findNextNode(nodes, edges, currentNode.id, "default") ||
      findNextNode(nodes, edges, currentNode.id, null);

    if (!next) {
      setFinished(true);
      return;
    }

    setCurrentNodeId(next.id);

    // ✅ message만 즉시 출력
    if (next.type === "message") {
      pushBotStep(makeStepId(next.id), next.data?.content ?? "");
    }

    logToEngine(
      { action: { type: "reply", value: reply.value, display: reply.display } },
      engineProps,
    );
  };

  return {
    handleContinueFromMessage,
    handleContinueFromLlm,
    handleBranchClick,
    handleSubmitForm,
    handleNextFromLink,
    handleContinueFromIframe,
    handleSlotFillingClick,
  };
}

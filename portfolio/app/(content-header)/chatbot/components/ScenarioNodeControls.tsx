// app/(content-header)/chatbot/components/ScenarioNodeControls.tsx
"use client";

import React from "react";
import { useModal } from '@/providers/ModalProvider';
import { resolveTemplate } from "../utils";

type AnyNode = {
  id: string;
  type: string;
  data: any;
};

type ScenarioNodeControlsProps = {
  currentNode: AnyNode | null;
  finished: boolean;
  formValues: Record<string, any>;
  setFormValues: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  slotValues: Record<string, any>;
  onReset: () => void;
  onContinueFromMessage: () => void;
  onBranchClick: (reply: { display: string; value: string }) => void;
  onSubmitForm: (e: React.FormEvent) => void;
  onNextFromLink: () => void;

  // LLM 노드용
  llmDone: boolean;
  onContinueFromLlm: () => void;
  
  // iframe 노드용
  onContinueFromIframe: () => void;

  // slot filling
  onSlotFillingClick?: (reply: { display: string; value: any }) => void;
};

export default function ScenarioNodeControls({
  currentNode,
  finished,
  formValues,
  setFormValues,
  slotValues,
  onReset,
  onContinueFromMessage,
  onBranchClick,
  onSubmitForm,
  onNextFromLink,
  llmDone,
  onContinueFromLlm,
  onContinueFromIframe,
  onSlotFillingClick,
}: ScenarioNodeControlsProps) {
  const { showAlert, showConfirm } = useModal();

  // currentNode 타입별 UI 렌더
  if (!currentNode || finished) {
    return (
      <div className="mt-3 flex justify-end gap-2">
        <button
          className="rounded-md border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
          onClick={onReset}
        >
          시나리오 다시 실행
        </button>
      </div>
    );
  }

  // 🔹 LLM 노드: 스트림 끝나면 "계속" 버튼으로 다음 노드로 이동
  if (currentNode.type === "llm") {
    return (
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={llmDone ? onContinueFromLlm : undefined}
          disabled={!llmDone}
          className={
            "rounded-md px-3 py-1.5 text-xs font-medium shadow " +
            (llmDone
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-300 text-gray-600 cursor-not-allowed")
          }
        >
          {llmDone ? "계속" : "LLM 처리 중..."}
        </button>
      </div>
    );
  }

  if (currentNode.type === "message") {
    return (
      <div className="mt-3 flex justify-end">
        <button
          onClick={onContinueFromMessage}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
        >
          계속
        </button>
      </div>
    );
  }

  if (currentNode.type === "branch") {
    const replies: { display: string; value: string }[] =
      currentNode.data?.replies ?? [];
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {replies.map((r) => (
          <button
            key={r.value}
            onClick={() => onBranchClick(r)}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
          >
            {r.display}
          </button>
        ))}
      </div>
    );
  }
  
  if (currentNode.type === "slotFilling" || currentNode.type === "slotfilling") {
    const replies: { display: string; value: any }[] =
      currentNode.data?.replies ?? currentNode.data?.quickReplies ?? [];

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {replies.map((r) => (
          <button
            key={String(r.value)}
            type="button"
            onClick={() => onSlotFillingClick?.(r)}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
          >
            {r.display}
          </button>
        ))}
      </div>
    );
  }

  if (currentNode.type === "form") {
    const elements: any[] = currentNode.data?.elements ?? [];

    return (
      <form onSubmit={onSubmitForm} className="mt-3 space-y-3 text-xs">
        {elements.map((el) => {
          const commonLabel = (
            <label className="mb-1 font-medium text-gray-700">
              {el.label || el.name}
            </label>
          );

          // element.type 에 따라 다른 UI 렌더
          switch (el.type) {
            case "input":
            case "search": {
              return (
                <div key={el.id} className="flex flex-col">
                  {commonLabel}
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs
                              focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder={el.placeholder || ""}
                    value={formValues[el.name] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [el.name]: e.target.value,
                      }))
                    }
                  />
                </div>
              );
            }

            case "date": {
              return (
                <div key={el.id} className="flex flex-col">
                  {commonLabel}
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs
                              focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    value={formValues[el.name] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [el.name]: e.target.value,
                      }))
                    }
                  />
                </div>
              );
            }

            case "checkbox": {
              const selected: string[] = formValues[el.name] ?? [];
              const options: string[] = el.options ?? [];

              const toggle = (opt: string) => {
                setFormValues((prev) => {
                  const cur: string[] = prev[el.name] ?? [];
                  const exists = cur.includes(opt);
                  const next = exists
                    ? cur.filter((v) => v !== opt)
                    : [...cur, opt];
                  return { ...prev, [el.name]: next };
                });
              };

              return (
                <div key={el.id} className="flex flex-col">
                  {commonLabel}
                  <div className="space-y-1">
                    {options.map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-2 text-[11px] text-gray-700"
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3 rounded border-gray-300 text-emerald-600"
                          checked={selected.includes(opt)}
                          onChange={() => toggle(opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }

            case "dropbox": {
              const options: string[] = el.options ?? [];
              return (
                <div key={el.id} className="flex flex-col">
                  {commonLabel}
                  <select
                    className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs
                              bg-white focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    value={formValues[el.name] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [el.name]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select...</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            case "grid": {
              const rows =
                el.optionsSlot && slotValues[el.optionsSlot]
                  ? slotValues[el.optionsSlot]
                  : el.data ?? [];
              const displayKeys: { key: string; label: string }[] =
                el.displayKeys ?? [];
              const selectedRowId = formValues[el.name]?.id ?? null;

              return (
                <div key={el.id} className="flex flex-col">
                  {commonLabel}
                  <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
                    <table className="min-w-full border-collapse text-[11px]">
                      <thead className="bg-gray-50">
                        <tr>
                          {displayKeys.map((col: any) => (
                            <th
                              key={col.key}
                              className="border-b border-gray-200 px-2 py-1 text-left font-medium text-gray-700"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row: any, idx: number) => {
                          const rowId = row.id ?? idx;
                          const isSelected = selectedRowId === rowId;
                          return (
                            <tr
                              key={rowId}
                              className={
                                "cursor-pointer hover:bg-emerald-50 " +
                                (isSelected ? "bg-emerald-50" : "")
                              }
                              onClick={() =>
                                setFormValues((prev) => ({
                                  ...prev,
                                  [el.name]: { id: rowId, ...row },
                                }))
                              }
                            >
                              {displayKeys.map((col: any) => (
                                <td
                                  key={col.key}
                                  className="border-b border-gray-100 px-2 py-1"
                                >
                                  {row[col.key]}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                        {(!rows || rows.length === 0) && (
                          <tr>
                            <td
                              className="px-2 py-2 text-center text-gray-400"
                              colSpan={displayKeys.length || 1}
                            >
                              데이터가 없습니다.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {formValues[el.name] && (
                    <div className="mt-1 text-[10px] text-emerald-700">
                      선택된 행:{" "}
                      {displayKeys
                        .map((col) => formValues[el.name][col.key])
                        .filter(Boolean)
                        .join(" / ")}
                    </div>
                  )}
                </div>
              );
            }

            default: {
              return (
                <div key={el.id} className="flex flex-col">
                  {commonLabel}
                  <input
                    type="text"
                    className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs
                              focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    value={formValues[el.name] ?? ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [el.name]: e.target.value,
                      }))
                    }
                  />
                </div>
              );
            }
          }
        })}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            제출 &amp; 다음
          </button>
        </div>
      </form>
    );
  }

  if (currentNode.type === "link") {
    const url = currentNode.data?.content ?? "";
    const label = currentNode.data?.display || "열기";
    return (
      <div className="mt-3 flex flex-col gap-2 text-xs">
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
          >
            <span>{label}</span>
            <span className="text-[10px]">↗</span>
          </a>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onNextFromLink}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  if (currentNode.type === "toast") {
    const message = currentNode.data?.message ?? "{{value}}";

    return (
      <div className="mt-3 flex flex-col gap-2 text-xs">
        <div className="text-gray-700">
          토스트 메시지: <span className="font-medium">{message}</span>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              // 1) 먼저 모달/토스트 실행
              const renderedMsg = resolveTemplate(message, slotValues);
              showAlert(renderedMsg); // 또는 showAlert(renderedMsg)
              // 2) 다음 노드로 이동
              onNextFromLink();
            }}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            실행 & 다음
          </button>
        </div>
      </div>
    );
  }

  if (currentNode.type === "delay") {
    return (
      <div className="mt-3 text-right text-[10px] text-gray-500">
        대기 중...
      </div>
    );
  }

  // iframe 노드: 에뮬레이터 안에서 외부 화면 표시 + 계속 버튼
  if (currentNode.type === "iframe") {
    const rawUrl = currentNode.data?.url ?? "";
    const width = Number(currentNode.data?.width || 600);
    const height = Number(currentNode.data?.height || 400);

    // {{base64Data}} 같은 템플릿 치환
    const url = resolveTemplate(rawUrl, slotValues);

    return (
      <div className="mt-3 flex flex-col gap-2 text-xs">
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
          {url ? (
            <iframe
              src={url}
              style={{ width: "100%", height }}
              className="block border-0"
            />
          ) : (
            <div className="px-3 py-6 text-center text-gray-400">
              iframe URL이 설정되지 않았습니다.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onContinueFromIframe}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            계속
          </button>
        </div>
      </div>
    );
  }

  return null;
}

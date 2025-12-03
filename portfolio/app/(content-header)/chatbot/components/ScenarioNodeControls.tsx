// app/(content-header)/chatbot/components/ScenarioNodeControls.tsx
"use client";

import React from "react";

type AnyNode = {
  id: string;
  type: string;
  data: any;
};

type ScenarioNodeControlsProps = {
  currentNode: AnyNode | null;
  finished: boolean;
  formValues: Record<string, string>;
  setFormValues: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  onReset: () => void;
  onContinueFromMessage: () => void;
  onBranchClick: (reply: { display: string; value: string }) => void;
  onSubmitForm: (e: React.FormEvent) => void;
  onNextFromLink: () => void;
};

export default function ScenarioNodeControls({
  currentNode,
  finished,
  formValues,
  setFormValues,
  onReset,
  onContinueFromMessage,
  onBranchClick,
  onSubmitForm,
  onNextFromLink,
}: ScenarioNodeControlsProps) {
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

  if (currentNode.type === "form") {
    const elements: any[] = currentNode.data?.elements ?? [];
    return (
      <form onSubmit={onSubmitForm} className="mt-3 space-y-3 text-xs">
        {elements.map((el) => (
          <div key={el.id} className="flex flex-col gap-1">
            <label className="font-medium text-gray-700">
              {el.label || el.name}
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
        ))}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            제출 & 다음
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

  return null;
}

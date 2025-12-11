"use client";

import { useEffect } from "react";
import useUserTokenStore from "../../store";
import { formatNumber } from "../../utils";
import { PlusIcon, MinusIcon } from "../Icons";

export default function TokenHistoryModal({ open, onClose, user }: any) {
  const { history, fetchHistory, loading } = useUserTokenStore();

  useEffect(() => {
    if (open && user) fetchHistory(user.id);
  }, [open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl p-5 shadow-xl">

        <div className="flex justify-between mb-3">
          <h2 className="text-lg font-semibold">토큰 사용 내역</h2>
          <button className="text-gray-500" onClick={onClose}>×</button>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        <div className="max-h-[300px] overflow-y-auto border rounded-md">
          {history.length === 0 && !loading && (
            <p className="text-sm text-gray-400 p-4">내역이 없습니다.</p>
          )}

          <ul className="divide-y">
            {history.map((h) => (
              <li key={h.id} className="p-3 text-sm">
                <div className="flex justify-between">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    {h.amount > 0 ? (
                      <PlusIcon className="text-emerald-500" />
                    ) : (
                      <MinusIcon className="text-gray-500" />
                    )}
                    {formatNumber(Math.abs(h.amount))}
                  </span>
                  <span className="text-gray-500">{h.createdAt}</span>
                </div>
                {h.memo && (
                  <p className="text-xs text-gray-500 mt-1">{h.memo}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  총 {formatNumber(h.beforeTotal)} → {formatNumber(h.afterTotal)} / 
                  잔여 {formatNumber(h.beforeRemain)} → {formatNumber(h.afterRemain)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 text-right">
          <button
            className="px-4 py-2 bg-gray-100 rounded-md text-sm"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

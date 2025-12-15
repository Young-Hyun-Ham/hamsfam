// app/(siderbar-header)/admin/token-manage/components/modal/TokenChargeModal.tsx
"use client";

import { useMemo, useState, ChangeEvent, FormEvent } from "react";
import { AdminTokenUser } from "../../types";
import useAdminTokenStore from "../../store";
import { formatNumber } from "../../utils";
import axios from "axios";
import { useTokenInput } from "@/types/token";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 충전 완료 후 부모에서 목록 리로드 등 처리용 */
  onCharged?: () => void;
  /** 전체 사용자 목록 (상단 + 토큰충전에서 사용자 선택용) */
  users: AdminTokenUser[];
  /** 행에서 Edit 로 들어올 때 대상 사용자 */
  targetUser: AdminTokenUser | null;
};

export default function TokenChargeModal({
  open,
  onClose,
  onCharged,
  users,
  targetUser,
}: Props) {
  const { chargeToken } = useAdminTokenStore();

  const [search, setSearch] = useState("");
  const [selectedSub, setSelectedSub] = useState<string | null>(
    targetUser?.sub ?? null,
  );
  const [amount, setAmount] = useState<string>("");
  const [memo, setMemo] = useState("");

  const isEditForSingleUser = !!targetUser;

  const filteredUsers = useMemo(() => {
    if (isEditForSingleUser) return users;
    const k = search.toLowerCase().trim();
    if (!k) return users;
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(k) ||
        (u.email ?? "").toLowerCase().includes(k) ||
        (u.sub ?? "").toLowerCase().includes(k),
    );
  }, [users, search, isEditForSingleUser]);

  const selectedUser =
    targetUser ??
    filteredUsers.find((u) => u.sub === selectedSub) ??
    null;

  const handleClose = () => {
    setAmount("");
    setMemo("");
    if (!isEditForSingleUser) {
      setSearch("");
      setSelectedSub(null);
    }
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      alert("사용자를 선택해 주세요.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value)) {
      alert("충전할 토큰 수를 올바르게 입력해 주세요.");
      return;
    }

    try {
      // store 액션 호출 → 디비 반영 + 목록 리로드까지 store 내부에서 처리
      await chargeToken({
        userId: selectedUser.id,
        amount: value,
        memo,
      });

      alert(
        `${selectedUser.name ?? selectedUser.email ?? selectedUser.sub} 님에게 토큰 ${value.toLocaleString()}개를 충전했습니다. (TODO: 실제 API 연동)`,
      );

      if (onCharged) await onCharged();
      handleClose();
    } catch (err: any) {
      alert(err?.message ?? "토큰 충전 중 오류가 발생했습니다.");
    }
  };

  const tokenUse = async () => {
    const payload: useTokenInput = {
      userId: selectedUser?.id ?? "",
      amount: 10,
      usageType: "llm",
      source: "chatbot",
      sessionId: "session-1765153859736",
      messageId: "welcome-1765153859736",
      memo: "챗봇 대화 1턴 사용",
    }
    await axios.post("/api/user-token/firebase/use", payload);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl p-5">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            토큰 충전
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* 사용자 선택 영역 */}
          {isEditForSingleUser ? (
            <div className="flex flex-col">
              <label className="mb-1 text-xs font-medium text-gray-600">
                사용자
              </label>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                <div className="font-semibold">
                  {targetUser?.name ?? "-"}
                </div>
                <div className="text-xs text-gray-500">
                  {targetUser?.email ?? targetUser?.sub}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-gray-600">
                사용자 선택
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                placeholder="이름 / 이메일 / ID 검색"
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
              />
              {/* 약 5명 정도 보이는 높이(대략 200px)까지는 그대로, 그 이상이면 스크롤 */}
              <div className="max-h-[200px] overflow-y-auto rounded-md border border-gray-200">
                {filteredUsers.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    검색된 사용자가 없습니다.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedSub === u.sub;
                      return (
                        <>
                        <li key={u.sub}>
                          <button
                            type="button"
                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs ${
                              isSelected
                                ? "bg-emerald-50 text-emerald-700"
                                : "hover:bg-gray-50"
                            }`}
                            onClick={() => setSelectedSub(u.sub)}
                          >
                            <div>
                              <div className="font-medium">
                                {u.name ?? "-"}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {u.email ?? u.sub}
                              </div>
                            </div>
                            <div className="text-right text-[11px] text-gray-500">
                              잔여{" "}
                              {u.remainToken?.toLocaleString() ?? 0}
                            </div>
                          </button>
                        </li>
                        </>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* 현재 토큰 정보 (선택된 사용자 기준) */}
          {selectedUser && (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-gray-500 mb-1">총토큰</div>
                <div className="font-semibold text-gray-900">
                  {formatNumber(selectedUser.totalToken)}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-gray-500 mb-1">사용한토큰</div>
                <div className="font-semibold text-gray-900">
                  {formatNumber(selectedUser.usedToken)}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-gray-500 mb-1">잔여토큰</div>
                <div className="font-semibold text-gray-900">
                  {formatNumber(selectedUser.remainToken)}
                </div>
              </div>
            </div>
          )}

          {/* 충전 입력 */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-600">
              충전할 토큰 수
            </label>
            <input
              type="number"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="예: 10,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              마이너스(-) 토큰을 충전 시 토큰수를 차감합니다.
            </p>
          </div>

          {/* 메모 */}
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-gray-600">
              메모 (선택)
            </label>
            <textarea
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none min-h-[60px]"
              placeholder="충전 사유를 간단히 입력해 주세요."
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {/* 버튼 영역 */}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
              onClick={tokenUse}
            >
              사용(테스트)
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50"
              onClick={handleClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
            >
              충전
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

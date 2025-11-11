// =============================================
// File: providers/ModalProvider.tsx
// Desc: 앱 전역에서 사용하는 Alert/Confirm 모달 Provider
// Stack: Next.js App Router, React, TypeScript, Tailwind
// =============================================
"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------- Types ----------
export type AlertOptions = {
  title?: string;
  message?: React.ReactNode;
  okText?: string;
  className?: string;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
};

export type ConfirmOptions = {
  title?: string;
  message?: React.ReactNode;
  okText?: string;
  cancelText?: string;
  destructive?: boolean; // 빨간 버튼 스타일
  className?: string;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
};

type DialogBase = {
  id: string;
  title?: string;
  message?: React.ReactNode;
  className?: string;
  closeOnEsc?: boolean;
  closeOnOutside?: boolean;
};

type AlertDialog = DialogBase & {
  type: "alert";
  okText?: string;
  resolve: () => void;
};

type ConfirmDialog = DialogBase & {
  type: "confirm";
  okText?: string;
  cancelText?: string;
  destructive?: boolean;
  resolve: (v: boolean) => void;
};

export type DialogItem = AlertDialog | ConfirmDialog;

// ---------- Context ----------
export type ModalContextValue = {
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export const useModal = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within <ModalProvider/>");
  return ctx;
};

// ---------- Internal helpers ----------
const genId = () => Math.random().toString(36).slice(2, 10);

// ---------- Provider + Root UI ----------
export default function ModalProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<DialogItem[]>([]);
  const active = queue[0];

  // 스크롤 락
  useEffect(() => {
    if (active) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [active]);

  const showAlert = useCallback((options: AlertOptions | string) => {
    return new Promise<void>((resolve) => {
      const opts: AlertOptions = typeof options === "string" ? { message: options } : options;
      setQueue((prev) => [
        ...prev,
        {
          id: genId(),
          type: "alert",
          title: opts.title,
          message: opts.message,
          okText: opts.okText ?? "확인",
          className: opts.className,
          closeOnEsc: opts.closeOnEsc ?? true,
          closeOnOutside: opts.closeOnOutside ?? false,
          resolve,
        },
      ]);
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const opts: ConfirmOptions = typeof options === "string" ? { message: options } : options;
      setQueue((prev) => [
        ...prev,
        {
          id: genId(),
          type: "confirm",
          title: opts.title,
          message: opts.message,
          okText: opts.okText ?? "확인",
          cancelText: opts.cancelText ?? "취소",
          destructive: !!opts.destructive,
          className: opts.className,
          closeOnEsc: opts.closeOnEsc ?? true,
          closeOnOutside: opts.closeOnOutside ?? false,
          resolve,
        },
      ]);
    });
  }, []);

  const value = useMemo<ModalContextValue>(() => ({ showAlert, showConfirm } as any), [showAlert, showConfirm]);

  const closeActive = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const onResolve = useCallback((result?: boolean) => {
    const current = queue[0];
    if (!current) return;
    if (current.type === "alert") {
      current.resolve();
    } else {
      current.resolve(!!result);
    }
    closeActive();
  }, [queue, closeActive]);

  return (
    <ModalContext.Provider value={value}>
      {children}
      <ModalRoot dialog={active} onResolve={onResolve} />
    </ModalContext.Provider>
  );
}

// ---------- ModalRoot (Portal) ----------
function ModalRoot({ dialog, onResolve }: { dialog?: DialogItem; onResolve: (v?: boolean) => void }) {
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  // ESC 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!dialog) return;
      if (e.key === "Escape" && dialog.closeOnEsc) {
        if (dialog.type === "confirm") onResolve(false);
        else onResolve();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [dialog, onResolve]);

  // 오픈 시 포커스 이동
  useEffect(() => {
    if (dialog && firstBtnRef.current) {
      firstBtnRef.current.focus();
    }
  }, [dialog]);

  if (!mounted) return null;
  if (!dialog) return null;

  return createPortal(
    <div
      aria-modal
      role="dialog"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[1000] flex items-center justify-center"
    >
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target !== overlayRef.current) return;
          if (dialog.closeOnOutside) {
            if (dialog.type === "confirm") onResolve(false);
            else onResolve();
          }
        }}
      />

      {/* Panel */}
      <div
        className={`relative mx-4 w-full max-w-md rounded-2xl bg-[var(--panel,#111213)] p-5 shadow-2xl ring-1 ring-white/10 ${dialog.className ?? ""}`}
      >
        {dialog.title && (
          <h2 id="modal-title" className="text-lg font-semibold text-[var(--text,#e8e8e8)]">
            {dialog.title}
          </h2>
        )}
        {dialog.message && (
          <div className="mt-3 text-[var(--text,#e8e8e8)]/90 text-sm leading-6">
            {dialog.message}
          </div>
        )}

        {/* Buttons */}
        {dialog.type === "alert" ? (
          <div className="mt-5 flex justify-end gap-2">
            <button
              ref={firstBtnRef}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
              onClick={() => onResolve()}
            >
              {dialog.okText ?? "확인"}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex justify-end gap-2">
            <button
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black"
              onClick={() => onResolve(false)}
            >
              {dialog.cancelText ?? "취소"}
            </button>
            <button
              ref={firstBtnRef}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ${
                (dialog as ConfirmDialog).destructive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={() => onResolve(true)}
            >
              {dialog.okText ?? "확인"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
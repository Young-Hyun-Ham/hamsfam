// app/(siderbar-header)/admin/token-manage/components/Icons.tsx
"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function PlusIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" className="text-gray-300" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function MinusIcon({ size = 16, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" className="text-gray-300" />
      <path d="M8 12h8" />
    </svg>
  );
}

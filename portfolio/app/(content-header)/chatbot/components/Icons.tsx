// app/(content-header)/chatbot/components/Icons.tsx
"use client";

import React from "react";

const iconColor = "#201D71";

type IconProps = React.SVGProps<SVGSVGElement>;

export function SidebarToggleIcon(props: IconProps) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      {/* 햄버거 3줄 */}
      <path
        d="M4 6h10M4 12h10M4 18h10"
        stroke={iconColor}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      {/* 왼쪽 화살표 */}
      <path
        d="M17 8l-3 4 3 4"
        stroke={iconColor}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NewChatIcon(props: IconProps) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      {/* 문서 */}
      <rect
        x={6}
        y={4}
        width={10}
        height={14}
        rx={1.5}
        stroke={iconColor}
        strokeWidth={1.6}
      />
      <path
        d="M9 8h4"
        stroke={iconColor}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <path
        d="M9 11h4"
        stroke={iconColor}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* 연필 */}
      <path
        d="M15.5 15.5l2.5 2.5-3.2.7.7-3.2z"
        stroke={iconColor}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <path
        d="M16.8 14.2l1 1"
        stroke={iconColor}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      {/* 바깥 원 */}
      <circle
        cx={12}
        cy={12}
        r={6}
        stroke={iconColor}
        strokeWidth={1.6}
      />
      {/* 시계 바늘 */}
      <path
        d="M12 9v3l2 1"
        stroke={iconColor}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 되감기 화살표 */}
      <path
        d="M8.5 5.5L7 4v3h3L8.5 5.5z"
        fill={iconColor}
      />
      <path
        d="M7 4a8 8 0 0 1 11 2"
        stroke={iconColor}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

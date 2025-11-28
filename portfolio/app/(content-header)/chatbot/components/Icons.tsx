// app/(content-header)/chatbot/components/Icons.tsx
"use client";

import React from "react";

const iconColor = "#201D71";

type IconProps = React.SVGProps<SVGSVGElement>;

export const SidebarToggleIcon = ({
  open = true,
  className,
}: {
  open?: boolean;
  className?: string;
}) => (
  <svg
    viewBox="0 0 28 28"
    width={28}
    height={28}
    fill="none"
    aria-hidden="true"
    className={className}
  >
    {/* 바깥 라운드 박스 */}
    <rect
      x="3"
      y="4"
      width="22"
      height="20"
      rx="5"
      stroke="#6B7280"   /* gray-500 */
      strokeWidth="1.6"
    />

    {/* 가운데 세로선 → hover 시 사라짐 */}
    <line
      x1="14"
      y1="6"
      x2="14"
      y2="22"
      stroke="#9CA3AF"   /* gray-400 */
      strokeWidth="1.4"
      strokeLinecap="round"
      className="transition-opacity duration-150 group-hover:opacity-0"
    />

    {/* hover 시 나타나는 화살표 */}
    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      {open ? (
        /* 열려 있을 때: 왼쪽으로 접는 "<" */
        <path
          d="M17 10L13 14L17 18"
          stroke="#6B7280"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        /* 닫혀 있을 때: 오른쪽으로 펼치는 ">" */
        <path
          d="M11 10L15 14L11 18"
          stroke="#6B7280"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </g>
  </svg>
);


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

// 히스토리 토글용 작은 ▶ 아이콘
export function SmallChevronRightIcon(props: IconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4.25 2.5L7.75 6L4.25 9.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 세션 메뉴(이름변경/삭제)용 … 아이콘
export function DotsHorizontalIcon(props: IconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="3.5" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
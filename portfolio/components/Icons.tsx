

export const ExpandIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M7 5L13 10L7 15" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

export const CollapseIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M13 5L7 10L13 15" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);

type Props = {
  className?: string;
};

export default function RefreshTokenIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 바깥 원 */}
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />

      {/* 리프레시 화살표 1 */}
      <path
        d="M6 9C6.3 7.5 7.5 6.3 9 6C10.5 5.7 11.9 6.3 12.8 7.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6 5.8L12.8 7.7L10.9 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 리프레시 화살표 2 */}
      <path
        d="M14 11C13.7 12.5 12.5 13.7 11 14C9.5 14.3 8.1 13.7 7.2 12.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.4 14.2L7.2 12.3L9.1 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 가운데 포인트(시계/토큰 느낌) */}
      <circle cx="10" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

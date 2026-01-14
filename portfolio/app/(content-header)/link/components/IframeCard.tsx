"use client"

export function IframeCard({ src }: { src: string }) {
  return (
    <div
      className="
        relative
        h-full
        min-h-0
        overflow-hidden
        rounded-3xl
        bg-white
        shadow-[0_20px_60px_rgba(0,0,0,0.12)]
        ring-1 ring-black/5
      "
    >
      <iframe
        src={src}
        className="h-full w-full border-0"
        title="external"
      />
    </div>
  );
}
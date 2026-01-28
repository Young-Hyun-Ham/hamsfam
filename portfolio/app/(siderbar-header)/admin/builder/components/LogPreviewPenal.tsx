import { useEffect, useRef, useState } from "react";
import useBuilderStore from '../store/index';

const LogPreview = () => {
  const onEdgesChange = useBuilderStore((state) => state.onEdgesChange);
  const onNodesChange = useBuilderStore((state) => state.onNodesChange);


  const [dbJsonText, setDbJsonText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 자동 높이 조절
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [dbJsonText]);

  // 적용 버튼
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(dbJsonText);
      if (parsed.nodes && parsed.edges) {
        onNodesChange(parsed.nodes);
        onEdgesChange(parsed.edges);
        alert("Flow UI가 성공적으로 갱신되었습니다.");
      } else {
        alert("JSON에 'nodes' 또는 'edges' 필드가 없습니다.");
      }
    } catch (err) {
      alert("유효하지 않은 JSON 형식입니다.");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-white border-l">
      <h2 className="text-xl font-bold mb-4">Log</h2>

      {/* Header + 버튼 라벨 영역 */}
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="font-semibold">db json data</span>
        <button
          onClick={handleApplyJson}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          적용
        </button>
      </div>

      {/* 입력창 */}
      <textarea
        ref={textareaRef}
        className="w-full mt-1 text-[10px] font-mono border rounded p-2 resize-none overflow-hidden bg-gray-100"
        value={dbJsonText}
        placeholder="nodes"
        onChange={(e) => setDbJsonText(e.target.value)}
      />
      <textarea
        ref={textareaRef}
        className="w-full mt-1 text-[10px] font-mono border rounded p-2 resize-none overflow-hidden bg-gray-100"
        value={dbJsonText}
        placeholder="edges"
        onChange={(e) => setDbJsonText(e.target.value)}
      />
    </div>
  );
};

export default LogPreview;

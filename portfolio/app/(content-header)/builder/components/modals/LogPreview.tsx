import { useEffect, useRef, useState } from "react";

type LogPreviewProps = {
  nodes: any[];
  edges: any[];
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
};

const LogPreview = ({
  nodes, 
  edges, 
  setNodes, 
  setEdges,
}: LogPreviewProps) => {

  // 🔹 텍스트 영역: 초기값은 현재 그래프 상태로 한 번만 세팅
  const [nodesJsonText, setNodesJsonText] = useState("[]");
  const [edgesJsonText, setEdgesJsonText] = useState("[]");

  useEffect(() => {
    setNodesJsonText(JSON.stringify(nodes, null, 2));
    setEdgesJsonText(JSON.stringify(edges, null, 2));
  }, []);

  // 🔹 Undo / Redo용 히스토리 (스냅샷들을 deep copy로 저장)
  const [history, setHistory] = useState<{ nodes: any[]; edges: any[] }[]>(() => [
    {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const nodesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const edgesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 🔹 nodes textarea 자동 높이
  useEffect(() => {
    if (nodesTextareaRef.current) {
      nodesTextareaRef.current.style.height = "auto";
      nodesTextareaRef.current.style.height =
        nodesTextareaRef.current.scrollHeight + "px";
    }
  }, [nodesJsonText]);

  // 🔹 edges textarea 자동 높이
  useEffect(() => {
    if (edgesTextareaRef.current) {
      edgesTextareaRef.current.style.height = "auto";
      edgesTextareaRef.current.style.height =
        edgesTextareaRef.current.scrollHeight + "px";
    }
  }, [edgesJsonText]);

  // 🔹 현재 Flow 상태를 다시 가져와 텍스트에 반영 (수동 Sync)
  const handleReloadFromFlow = () => {
    const newNodesJson = JSON.stringify(nodes, null, 2);
    const newEdgesJson = JSON.stringify(edges, null, 2);

    setNodesJsonText(newNodesJson);
    setEdgesJsonText(newEdgesJson);
  };

  // 🔹 Undo
  const handleUndo = () => {
    if (historyIndex <= 0) return;

    const newIdx = historyIndex - 1;
    const snapshot = history[newIdx];

    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);

    setNodesJsonText(JSON.stringify(snapshot.nodes, null, 2));
    setEdgesJsonText(JSON.stringify(snapshot.edges, null, 2));

    setHistoryIndex(newIdx);
  };

  // 🔹 Redo
  const handleRedo = () => {
    if (historyIndex < 0 || historyIndex >= history.length - 1) return;

    const newIdx = historyIndex + 1;
    const snapshot = history[newIdx];

    setNodes(snapshot.nodes);
    setEdges(snapshot.edges);

    setNodesJsonText(JSON.stringify(snapshot.nodes, null, 2));
    setEdgesJsonText(JSON.stringify(snapshot.edges, null, 2));

    setHistoryIndex(newIdx);
  };

  // 🔹 JSON 적용 버튼
  const handleApplyJson = () => {
    try {
      const parsedNodes = nodesJsonText.trim()
        ? JSON.parse(nodesJsonText)
        : [];
      const parsedEdges = edgesJsonText.trim()
        ? JSON.parse(edgesJsonText)
        : [];

      if (!Array.isArray(parsedNodes)) {
        alert(
          'nodes JSON은 배열 형태여야 합니다. (예: [ { ...node... }, ... ])'
        );
        return;
      }
      if (!Array.isArray(parsedEdges)) {
        alert(
          'edges JSON은 배열 형태여야 합니다. (예: [ { ...edge... }, ... ])'
        );
        return;
      }

      // ✅ 현재 그래프 상태를 히스토리에 저장 (Undo 가능하게)
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1); // Redo 분기 날리기
        const currentSnapshot = {
          nodes: JSON.parse(JSON.stringify(nodes)),
          edges: JSON.parse(JSON.stringify(edges)),
        };
        return [...sliced, currentSnapshot];
      });
      setHistoryIndex((idx) => idx + 1);

      // ✅ JSON을 실제 그래프에 반영
      setNodes(parsedNodes as any[]);
      setEdges(parsedEdges as any[]);

      alert("Flow UI가 성공적으로 갱신되었습니다.");
    } catch (err) {
      console.error(err);
      alert("유효하지 않은 JSON 형식입니다.");
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <h2 className="text-base font-bold mb-3">Log</h2>

      {/* Header + 버튼 영역 */}
      <div className="flex flex-wrap gap-2 items-center justify-between text-xs mb-2">
        <span className="font-semibold">db json data</span>
        <div className="flex gap-2">
          <button
            onClick={handleReloadFromFlow}
            className="px-3 py-1 border rounded text-xs hover:bg-gray-100"
          >
            그래프에서 다시 불러오기
          </button>
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`px-3 py-1 rounded text-xs ${
              canUndo
                ? "border hover:bg-gray-100"
                : "border border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`px-3 py-1 rounded text-xs ${
              canRedo
                ? "border hover:bg-gray-100"
                : "border border-gray-200 text-gray-300 cursor-not-allowed"
            }`}
          >
            Redo
          </button>
          <button
            onClick={handleApplyJson}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            적용
          </button>
        </div>
      </div>

      {/* NODES 영역 */}
      <div className="mb-3">
        <div className="flex justify-between items-center text-[11px] mb-1">
          <span className="font-semibold">nodes JSON</span>
          <span className="text-[10px] text-gray-500">
            예: [ &#123; ...node... &#125;, ... ]
          </span>
        </div>
        <textarea
          ref={nodesTextareaRef}
          className="w-full mt-1 text-[10px] font-mono border rounded p-2 resize-none overflow-x-hidden bg-gray-100"
          style={{
            minHeight: "40px",
            maxHeight: "200px",
          }}
          value={nodesJsonText}
          placeholder='[ { "id": "...", "type": "message", ... }, ... ]'
          onChange={(e) => setNodesJsonText(e.target.value)}
        />
      </div>

      {/* EDGES 영역 */}
      <div>
        <div className="flex justify-between items-center text-[11px] mb-1">
          <span className="font-semibold">edges JSON</span>
          <span className="text-[10px] text-gray-500">
            예: [ &#123; ...edge... &#125;, ... ]
          </span>
        </div>
        <textarea
          ref={edgesTextareaRef}
          className="w-full mt-1 text-[10px] font-mono border rounded p-2 resize-none overflow-x-hidden bg-gray-100"
          style={{
            minHeight: "40px",
            maxHeight: "200px",
          }}
          value={edgesJsonText}
          placeholder='[ { "id": "...", "source": "...", "target": "...", ... ]'
          onChange={(e) => setEdgesJsonText(e.target.value)}
        />
      </div>
    </div>
  );
};

export default LogPreview;

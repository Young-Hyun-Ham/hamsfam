import useStudyStore from "../store";

export default function StudyJobTable({ jobs }: any) {
  const { selectedJobId, setSelectedJobId } = useStudyStore();

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3 text-sm font-semibold">학습 실행 이력</div>

      <div className="max-h-[360px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b text-gray-500">
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left">대상</th>
              <th className="px-3 py-2 text-left">시작</th>
              <th className="px-3 py-2 text-left">메시지</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j: any) => {
              const active = selectedJobId === j.id;
              return (
                <tr
                  key={j.id}
                  className={[
                    "border-b cursor-pointer hover:bg-gray-50",
                    active ? "bg-emerald-50" : "",
                  ].join(" ")}
                  onClick={() => setSelectedJobId(j.id)}
                >
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      {j.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{j.targetSummary ?? j.targetType}</td>
                  <td className="px-3 py-2">{String(j.startedAt ?? "").slice(0, 19)}</td>
                  <td className="px-3 py-2 text-gray-600">{j.message}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

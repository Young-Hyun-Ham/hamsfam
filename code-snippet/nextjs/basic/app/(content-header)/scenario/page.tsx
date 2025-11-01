// app/chat/page.tsx
import { notFound } from 'next/navigation';
import ClientErrorButton from './ClientErrorButton';
import Link from 'next/link';

type ScenarioParam = { fail?: string };

export default async function ChatPage({ searchParams }: {
  searchParams: Promise<ScenarioParam>;
}) {
  await new Promise(r => setTimeout(r, 1200));
  
  const sp = await searchParams;
  if (sp?.fail === '1') notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Scenario 페이지</h1>
      <p className="text-sm text-gray-600 mb-6">
        이 화면은 <code>app/chat/page.tsx</code>에서 렌더됩니다.
      </p>
      <p className="text-sm text-gray-600 mb-6">
        <Link href="/scenario?fail=1">
          <code className="cursor-pointer text-blue-600 hover:underline">
            /scenario?fail=1
          </code>
        </Link>
        로 접속하면 not-found 페이지로 렌더됩니다.
      </p>
      <ClientErrorButton />
      <hr className="my-6" />
      <form className="flex gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2"
          placeholder="메시지를 입력하세요…"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4"
        >
          보내기
        </button>
      </form>
    </div>
  );
}

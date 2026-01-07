// app/page.tsx  (서버 컴포넌트)
import { getUserServer } from '@/lib/session';
import RootClient from '@/components/RootClient';

export default async function RootPage() {
  const user = await getUserServer();
  // console.log("RootPage user =======================> ", user)
  return <RootClient initialUser={user} />;
}

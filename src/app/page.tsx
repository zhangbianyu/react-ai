export default function Home() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME;

  return (
    <main>
      <h1>{appName}</h1>
      <p>React 学 AI 第一天</p>
      <p>Next.js 项目已经创建成功。</p>
    </main>
  );
}

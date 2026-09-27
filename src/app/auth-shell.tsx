"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setEmail(data.user?.email ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    setEmail(null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="site-header">
        <Link className="site-brand" href="/">
          AI 学习助手
        </Link>

        {email && pathname !== "/login" && (
          <div className="site-account">
            <span className="site-email">{email}</span>
            <Link className="site-link" href="/documents">
              文档
            </Link>
            <button
              className="sign-out-button"
              type="button"
              onClick={handleSignOut}
            >
              退出登录
            </button>
          </div>
        )}
      </header>
      {children}
    </>
  );
}

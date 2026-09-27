"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isRegister && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      setError("密码至少需要 6 个字符");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (isRegister) {
        const { data, error: signUpError } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
          });

        if (signUpError) {
          throw signUpError;
        }

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage("注册成功，请检查邮箱并完成确认后再登录。");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
        }

        return;
      }

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        throw signInError;
      }

      router.replace("/");
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "认证失败，请稍后重试",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="auth-title">
        <p className="eyebrow">AI STUDY ASSISTANT</p>
        <h1 id="auth-title">
          {isRegister ? "创建账号" : "登录学习助手"}
        </h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">密码</label>
          <input
            id="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          {isRegister && (
            <>
              <label htmlFor="confirm-password">确认密码</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                minLength={6}
                required
              />
            </>
          )}

          {error && (
            <p className="error auth-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading
              ? "处理中..."
              : isRegister
                ? "注册账号"
                : "登录"}
          </button>
        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={() => switchMode(isRegister ? "login" : "register")}
          disabled={loading}
        >
          {isRegister ? "已有账号？返回登录" : "还没有账号？注册账号"}
        </button>
      </section>
    </main>
  );
}

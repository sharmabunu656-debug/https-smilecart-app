import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useShopAuth } from "@/lib/shop-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/shop/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useShopAuth();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (user) navigate({ to: "/shop/account" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/shop`,
            data: { full_name: name, phone },
          },
        });
        if (error) throw error;
        toast.success("Welcome to FreshKart!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
      navigate({ to: "/shop" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/shop`,
    });
    if (result.error) {
      toast.error(result.error.message);
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/shop" });
  };

  return (
    <div className="space-y-5 py-4">
      <header className="text-center">
        <span className="text-5xl">🥕</span>
        <h1 className="mt-2 font-display text-2xl text-shop-fg">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-shop-muted">
          {mode === "signin" ? "Sign in to continue shopping" : "Start shopping fresh in seconds"}
        </p>
      </header>

      <button
        onClick={google}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-shop-card py-3 text-sm font-semibold text-shop-fg shadow-shop transition active:scale-95 disabled:opacity-50"
      >
        <GoogleIcon /> Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-shop-muted">
        <div className="h-px flex-1 bg-shop-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-shop-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <>
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              placeholder="Aarav Sharma"
              required
            />
            <Field
              label="Phone"
              value={phone}
              onChange={setPhone}
              placeholder="9876543210"
              required
              type="tel"
            />
          </>
        )}
        <Field
          label="Email"
          icon={<Mail className="h-4 w-4 text-shop-muted" />}
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          required
          type="email"
        />
        <Field
          label="Password"
          icon={<Lock className="h-4 w-4 text-shop-muted" />}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
          type="password"
        />

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-shop-primary py-3 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-shop-muted">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="font-semibold text-shop-primary"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>

      <p className="text-center text-xs text-shop-muted">
        <Link to="/shop" className="underline">Continue browsing without an account</Link>
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-shop-fg">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl bg-shop-card px-4 py-3 shadow-shop">
        {icon}
        <input
          required={required}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-shop-muted"
        />
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16 4 9.2 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.5 34.7 26.9 36 24 36c-5.3 0-9.7-3-11.3-7.3l-6.5 5C9.1 39.5 16 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.3 5.3C40.9 35.5 44 30.2 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

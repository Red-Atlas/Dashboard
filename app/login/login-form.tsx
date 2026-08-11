"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isNavigating, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "No se pudo iniciar sesión");
        setSubmitting(false);
        return;
      }

      setPassword("");
      // The session cookie is set; refresh so the proxy lets us through.
      startTransition(() => {
        router.replace("/");
        router.refresh();
      });
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const busy = submitting || isNavigating;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Contraseña
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ingresa tu contraseña"
          className="w-full"
          required
          autoFocus
        />
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={busy || !password}>
        {busy ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}

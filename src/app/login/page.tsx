"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Stub: auth real cuando existan keys de Supabase
    setMessage(
      "Login listo para cablear con Supabase Auth. Configura .env.local y vuelve a intentar.",
    );
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <h1>Sistema Pollo</h1>
        <p>
          Compra en Santa Cruz, Mairana y Cochabamba. Consignación y cobro en La
          Paz y El Alto.
        </p>
      </div>

      <form className="login-card" onSubmit={onSubmit}>
        <h2>Ingresar</h2>
        <div className="field">
          <label htmlFor="email">Email o usuario</label>
          <input
            id="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">
          Entrar
        </button>
        {message ? <p className="login-hint">{message}</p> : null}
        <p className="login-hint">
          Sin keys aún? Revisa el README → sección Supabase + Vercel.{" "}
          <Link href="/">Ir al panel (demo shell)</Link>
        </p>
      </form>
    </div>
  );
}

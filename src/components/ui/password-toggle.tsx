"use client";

type Props = {
  shown: boolean;
  onToggle: () => void;
};

export function PasswordToggle({ shown, onToggle }: Props) {
  return (
    <button
      type="button"
      className="login-eye"
      aria-label={shown ? "Ocultar contraseña" : "Ver contraseña"}
      aria-pressed={shown}
      onClick={onToggle}
    >
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-4.1 4.8" />
      <path d="M6.1 6.1C3.7 7.8 2 12 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4.1-.8" />
    </svg>
  );
}

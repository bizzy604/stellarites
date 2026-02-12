/**
 * Helpers for reading / writing the local user session to localStorage.
 *
 * The session is keyed by `kazi_chain_session` and holds the user's Stellar
 * public key, role, name, phone, etc.  No JWT – the public key is the
 * user's identity.
 */
import type { UserSession } from "../types";

const SESSION_KEY = "kazi_chain_session";

/** Persist session after sign-up or sign-in. */
export function saveSession(session: UserSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Keep legacy key for Dashboard.tsx routing
  localStorage.setItem("kazi_chain_role", session.role);
}

/** Read the current session (or null if not logged in). */
export function getSession(): UserSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

/** Clear session on logout. */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("kazi_chain_role");
  localStorage.removeItem("kazi_chain_users");
}

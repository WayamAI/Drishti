import * as React from "react";

/*
 * The auth context and its types, on their own so that AuthProvider.tsx
 * exports only a component and use-auth.ts only hooks — fast refresh needs
 * each file to be one or the other.
 */

export type Membership = {
  organizationId: number;
  organizationName: string;
  organizationSlug: string;
  role: string;
};

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  organizationId: number;
};

export type AuthContextValue = {
  user: AuthUser | null;
  memberships: Membership[];
  isAuthenticated: boolean;
  /** True until the boot-time session probe has settled. */
  isInitializing: boolean;
  /**
   * A refresh came back inconclusive and another attempt is pending.
   *
   * Not the same as being signed out. The server never said the session was
   * invalid — it was rate limited, or unreachable, or it failed — so the
   * honest thing to tell the user is that we are still checking, not that
   * their session ended. Goes false the moment the question is answered
   * either way, or when the retries are exhausted.
   */
  isRecovering: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
};

export const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

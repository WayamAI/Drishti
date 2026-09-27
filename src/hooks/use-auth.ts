import * as React from "react";
import { AuthContext } from "@/hooks/auth-context";

export type { AuthUser, Membership } from "@/hooks/auth-context";

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** Role helpers, so pages stop hand-rolling the same comparisons. */
export function useCanWrite() {
  const { user } = useAuth();
  return user?.role === "ADMIN" || user?.role === "ANALYST";
}

export function useIsAdmin() {
  const { user } = useAuth();
  return user?.role === "ADMIN";
}

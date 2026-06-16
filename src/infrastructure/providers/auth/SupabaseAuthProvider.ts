import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { AuthProvider, AuthUser } from "@/application/ports/providers/AuthProvider";
import { isAdminUser, isEmailAllowedByAllowlist, parseAdminAllowlist } from "@/application/services/auth/adminAccess";
import { env } from "@/infrastructure/config/env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

async function createCookieClient() {
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot always set cookies. Server actions and routes can.
        }
      }
    }
  });
}

export class SupabaseAuthProvider implements AuthProvider {
  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createCookieClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  }

  async requireUser(): Promise<AuthUser> {
    const user = await this.getCurrentUser();
    if (!user) redirect("/login");
    return user;
  }

  async requireUserWithAdminFlag(): Promise<{ user: AuthUser; isAdmin: boolean }> {
    const user = await this.getCurrentUser();
    if (!user) redirect("/login");
    return {
      user,
      isAdmin: isAdminUser(
        user.id,
        user.email,
        parseAdminAllowlist(env.ADMIN_USER_IDS),
        parseAdminAllowlist(env.ADMIN_EMAILS)
      )
    };
  }

  async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;
    return isAdminUser(
      user.id,
      user.email,
      parseAdminAllowlist(env.ADMIN_USER_IDS),
      parseAdminAllowlist(env.ADMIN_EMAILS)
    );
  }

  async requireAdmin(): Promise<AuthUser> {
    const user = await this.getCurrentUser();
    if (!user) redirect("/login");
    const isAdmin = isAdminUser(
      user.id,
      user.email,
      parseAdminAllowlist(env.ADMIN_USER_IDS),
      parseAdminAllowlist(env.ADMIN_EMAILS)
    );
    if (!isAdmin) notFound();
    return user;
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const supabase = await createCookieClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }

  async signUpWithPassword(email: string, password: string): Promise<void> {
    const allowlist = parseAdminAllowlist(env.ALLOWED_SIGNUP_EMAILS);
    if (!isEmailAllowedByAllowlist(email, allowlist)) {
      throw new Error("Signup is not currently available. Contact us for access.");
    }
    const supabase = await createCookieClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }

  async signOut(): Promise<void> {
    const supabase = await createCookieClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }
}

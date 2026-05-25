export type AuthUser = {
  id: string;
  email: string | null;
};

export interface AuthProvider {
  getCurrentUser(): Promise<AuthUser | null>;
  requireUser(): Promise<AuthUser>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}


import { signInAction, signUpAction } from "@/server/actions/authActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ETFVisionLogo } from "@/components/brand/etfvision-logo";
import { env } from "@/infrastructure/config/env";
import { parseAdminAllowlist } from "@/application/services/auth/adminAccess";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string; redirectTo?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const signupOpen = parseAdminAllowlist(env.ALLOWED_SIGNUP_EMAILS).length === 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <Card className="w-full max-w-md overflow-hidden border-slate-200 shadow-xl">
        <div className="border-b border-slate-200 bg-white px-8 pt-8">
          <ETFVisionLogo variant="light" priority className="mx-auto w-64 object-contain object-center" />
        </div>
        <CardHeader className="pt-6">
          <CardTitle>ETFVision</CardTitle>
          <CardDescription>Sign in to manage your ETF-first portfolio intelligence workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {params?.error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {params.error}
            </div>
          ) : null}
          <form action={signInAction} className="space-y-4">
            {params?.redirectTo ? <input type="hidden" name="redirectTo" value={params.redirectTo} /> : null}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <div className="grid gap-2">
              <Button type="submit" className="w-full">
                Sign in
              </Button>
              {signupOpen ? (
                <Button type="submit" variant="outline" className="w-full" formAction={signUpAction}>
                  Create account
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Early access only. Contact us to request an invitation.
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

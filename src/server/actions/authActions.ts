"use server";

import { redirect } from "next/navigation";
import { createContainer } from "@/server/container";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signInAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  try {
    await createContainer().authProvider.signInWithPassword(email, password);
  } catch (error) {
    redirect(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to sign in")}`);
  }
  redirect("/portfolio");
}

export async function signUpAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  try {
    await createContainer().authProvider.signUpWithPassword(email, password);
  } catch (error) {
    redirect(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : "Unable to create account")}`);
  }
  redirect("/setup");
}

export async function signOutAction() {
  await createContainer().authProvider.signOut();
  redirect("/login");
}


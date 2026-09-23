import { createSupabaseServerClient } from "./supabase-server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type UserContext = {
  supabase: SupabaseClient;
  user: User;
  userId: string;
};

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}

export async function getRequiredUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return {
    supabase,
    user,
    userId: user.id,
  };
}

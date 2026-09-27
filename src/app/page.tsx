import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import HomeChat from "./home-chat";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <HomeChat />;
}

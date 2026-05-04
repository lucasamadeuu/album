import { AmigosPageClient } from "@/components/amigos-page-client";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AmigosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: friends } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("share_collection", true)
    .neq("user_id", user.id)
    .order("display_name");

  return (
    <AmigosPageClient
      myUserId={user.id}
      initialProfile={(myProfile ?? null) as ProfileRow | null}
      friends={friends ?? []}
    />
  );
}

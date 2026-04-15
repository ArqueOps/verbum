import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <main data-testid="dashboard-page" className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
    </main>
  );
}

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/guards";

export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}

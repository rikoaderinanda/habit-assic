import { UserX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function MemberNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title="Anggota tidak ditemukan"
      description="Data anggota ini tidak ada atau sudah dihapus."
      action={
        <Button asChild variant="outline">
          <Link href="/admin/members">Kembali ke monitoring</Link>
        </Button>
      }
    />
  );
}

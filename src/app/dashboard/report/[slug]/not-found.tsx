import { SearchX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ProgramNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Program tidak ditemukan"
      description="Program yang Anda cari tidak ada atau sudah dihapus."
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard">Kembali ke Beranda</Link>
        </Button>
      }
    />
  );
}

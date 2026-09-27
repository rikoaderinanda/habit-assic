import Link from "next/link";

import { UserAvatar } from "@/components/shared/user-avatar";

type Item = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  trailing?: React.ReactNode;
};

/** Compact member list for dashboard cards; each row links to the member's detail page. */
export function MemberMiniList({ items, empty }: { items: Item[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/members/${item.id}`}
            // One link per member: prefetching them all floods the server on every view.
            prefetch={false}
            className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
          >
            <UserAvatar name={item.name} email={item.email} image={item.image} className="size-8" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{item.name ?? item.email}</span>
              {item.name && (
                <span className="block truncate text-xs text-muted-foreground">{item.email}</span>
              )}
            </span>
            {item.trailing}
          </Link>
        </li>
      ))}
    </ul>
  );
}

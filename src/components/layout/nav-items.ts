import {
  BarChart3,
  ClipboardCheck,
  FolderKanban,
  History,
  House,
  LayoutDashboard,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match only (otherwise any sub-path counts as active). */
  exact?: boolean;
  /** Path prefix that marks the item active (defaults to href). */
  matchPrefix?: string;
};

export const MEMBER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Beranda", icon: House, exact: true },
  { href: "/dashboard/report", label: "Lapor", icon: ClipboardCheck },
  { href: "/dashboard/stats", label: "Statistik", icon: BarChart3 },
  { href: "/dashboard/history", label: "Riwayat", icon: History },
];

/** Single bottom-nav entry for the whole admin area (mobile). */
export const ADMIN_NAV_ITEM: NavItem = {
  href: "/admin/dashboard",
  label: "Admin",
  icon: ShieldCheck,
  matchPrefix: "/admin",
};

/** Admin sections (sidebar on desktop, tabs on mobile). */
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Anggota", icon: Users },
  { href: "/admin/programs", label: "Program", icon: FolderKanban },
];

export function navItemsFor(isAdmin: boolean): NavItem[] {
  return isAdmin ? [...MEMBER_NAV, ADMIN_NAV_ITEM] : MEMBER_NAV;
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  const base = item.matchPrefix ?? item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

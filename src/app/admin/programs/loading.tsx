import { ListSkeleton } from "@/components/shared/skeletons";

// Safe here: this page has no same-route query navigation (see LinkPending).
export default function Loading() {
  return <ListSkeleton rows={3} />;
}

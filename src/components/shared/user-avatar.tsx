import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  email,
  image,
  className,
  fallbackClassName,
}: {
  name: string | null;
  email: string;
  image: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar className={cn("size-10", className)}>
      {/* Google photo URLs can 403 when a referrer is sent. */}
      {image && <AvatarImage src={image} alt={name ?? email} referrerPolicy="no-referrer" />}
      <AvatarFallback className={cn("bg-primary/10 font-medium text-primary", fallbackClassName)}>
        {initials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}

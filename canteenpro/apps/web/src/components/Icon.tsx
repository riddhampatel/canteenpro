import * as L from "lucide-react";
export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const C = (L as any)[name] ?? L.Circle;
  return <C className={className} aria-hidden />;
}

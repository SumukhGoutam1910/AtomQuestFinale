import { cn } from "@/lib/utils";

const PALETTE = [
  "from-[hsl(244_76%_59%)] to-[hsl(265_83%_62%)]",
  "from-[hsl(205_90%_48%)] to-[hsl(220_80%_56%)]",
  "from-[hsl(158_70%_40%)] to-[hsl(175_65%_42%)]",
  "from-[hsl(262_70%_58%)] to-[hsl(280_65%_60%)]",
  "from-[hsl(199_85%_48%)] to-[hsl(190_80%_46%)]",
];

function pick(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  ring?: boolean;
}

export function Avatar({ name, size = "md", className, ring }: AvatarProps) {
  const sizes = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-14 w-14 text-xl",
  };

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-semibold text-white",
        pick(name),
        sizes[size],
        ring && "ring-2 ring-surface ring-offset-2 ring-offset-background",
        className
      )}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

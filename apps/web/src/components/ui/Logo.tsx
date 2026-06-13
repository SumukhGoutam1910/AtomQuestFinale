import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const mark = {
  sm: "h-7 w-7 rounded",
  md: "h-9 w-9 rounded-md",
  lg: "h-11 w-11 rounded-md",
};
const icon = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
const word = { sm: "text-base", md: "text-lg", lg: "text-2xl" };

export function Logo({ size = "md", showWordmark = true, className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center bg-gradient-to-br from-primary to-[hsl(265_83%_62%)] elevation-primary",
          mark[size]
        )}
      >
        <svg viewBox="0 0 24 24" className={cn("text-white", icon[size])} fill="none">
          <path
            d="M3 8.5C3 7.4 3.9 6.5 5 6.5h9c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-7Z"
            fill="currentColor"
          />
          <path
            d="m17 11 3.2-2.1c.66-.44 1.55.03 1.55.83v6.54c0 .8-.89 1.27-1.55.83L17 16v-5Z"
            fill="currentColor"
            opacity="0.7"
          />
        </svg>
      </div>
      {showWordmark && (
        <span className={cn("font-semibold tracking-tighter text-foreground", word[size])}>
          Support<span className="text-gradient">Vision</span>
        </span>
      )}
    </div>
  );
}

import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-8 h-8 rounded-full cursor-pointer transition-all duration-200 active:scale-95"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {/* Outer ring - subtle raised edge */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/25 to-white/5 dark:from-white/15 dark:to-white/5 shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.2)]" />

      {/* Inner concave surface - softer iPhone 4 style */}
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-black/5 via-black/3 to-transparent dark:from-black/12 dark:via-black/6 dark:to-transparent shadow-[inset_0_1px_2px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(0,0,0,0.06)]" />
      
      {/* Icon container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {theme === "light" ? (
          /* Sun icon for light mode */
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground/70"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          /* Moon icon for dark mode */
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-foreground/70"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </div>
    </button>
  );
}

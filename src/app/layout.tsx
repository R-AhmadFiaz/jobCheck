import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/app/providers/AppProviders";
import { ToastContainer } from "@/components/ui";
import { ChatWidget } from "@/features/chat/ChatWidget";

export const metadata: Metadata = {
  title: "JobCheck",
};

// Sets the `dark` class before hydration/paint so there is no flash of the
// wrong theme. Must stay in exact sync with hooks/useDarkMode.ts's storage
// key and prefers-color-scheme fallback.
const DARK_MODE_ANTI_FLASH_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('jobcheck-dark-mode');
    var dark = stored !== null
      ? stored === 'true'
      : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning is scoped to this element only (it does not
    // propagate to children) and is the standard, documented fix for this
    // exact case: DARK_MODE_ANTI_FLASH_SCRIPT is a blocking inline script
    // that runs before hydration and mutates <html>'s class list directly
    // (adding "dark") based on localStorage/matchMedia — data that only
    // exists in the browser and is never available during SSR. The server
    // can never render that class correctly, so React would otherwise flag
    // a mismatch here on every load and strip the class back off right
    // before paint, defeating the anti-flash script entirely. This does
    // not hide a real bug: the DOM's className is intentionally set outside
    // of React's render output for this one attribute, and this is the
    // documented escape hatch for that (see AGENTS.md-adjacent dark-mode
    // notes in hooks/useDarkMode.ts).
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DARK_MODE_ANTI_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppProviders>
          {children}
          <ToastContainer />
          <ChatWidget />
        </AppProviders>
      </body>
    </html>
  );
}

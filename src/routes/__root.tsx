import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { PwaRuntime } from "@/components/pwa-runtime";
import appCss from "../styles.css?url";

const APP_NAME = "Joni Tracker";
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const THEME_BOOT = `(function(){try{var theme="system";var raw=localStorage.getItem("joni-tracker-v1");if(raw){var parsed=JSON.parse(raw);var saved=parsed&&parsed.state&&parsed.state.settings&&parsed.state.settings.theme;if(saved==="light"||saved==="dark"||saved==="system")theme=saved;}var systemDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=theme==="dark"||(theme==="system"&&systemDark);var root=document.documentElement;root.classList.toggle("dark",theme==="dark");root.classList.toggle("light",theme==="light");root.style.colorScheme=dark?"dark":"light";var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",dark?"#121815":"#F4EFE6");}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "A calm, private log for newborn feeds, diapers, and postpartum meds.",
      },
      { name: "theme-color", content: "#F4EFE6" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Joni" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Outfit:wght@400;500;600&display=swap",
      },
      { rel: "icon", type: "image/svg+xml", href: asset("/favicon.svg") },
      { rel: "icon", type: "image/png", sizes: "192x192", href: asset("/icon-192.png") },
      { rel: "apple-touch-icon", href: asset("/icon-180.png") },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: asset("/manifest.webmanifest") },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <PreviewHostBridge />
        <PwaRuntime />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});

import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/theme/theme-toggle";

const appNavItems = [
  { href: "/stream", label: "Studio" },
  { href: "/settings", label: "Settings" },
];

const landingNavItems = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
];

export default function Header({ landing = false }: { landing?: boolean }) {
  const navItems = landing ? [...landingNavItems, ...appNavItems] : appNavItems;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            width={36}
            height={36}
            alt="Vysl logo"
            src="/vysl.svg"
            className="h-9 w-9"
            priority
          />
          <span className="text-lg font-semibold tracking-tight">Vysl</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/stream"
            className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Start streaming
          </Link>
        </div>
      </div>
    </header>
  );
}

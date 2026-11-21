import Link from "next/link";
import Header from "@/components/layout/header";

const features = [
  {
    title: "Multistream anywhere",
    description:
      "Send one live feed to YouTube, Twitch, Kick, or any RTMP destination without juggling accounts.",
  },
  {
    title: "No account required",
    description:
      "Open Vysl and start configuring instantly. No sign-up, no onboarding funnel, no lock-in.",
  },
  {
    title: "Local-first keys",
    description:
      "RTMP URLs and stream keys stay in your browser's localStorage. Your credentials never leave your device.",
  },
  {
    title: "Built for speed",
    description:
      "A clean, focused workflow for creators who want to go live fast instead of managing another SaaS dashboard.",
  },
];

const steps = [
  {
    step: "01",
    title: "Add destinations",
    description: "Paste the RTMP server and stream key for each platform you want to reach.",
  },
  {
    step: "02",
    title: "Save locally",
    description: "Vysl keeps your setup in localStorage so it is ready next time on this device.",
  },
  {
    step: "03",
    title: "Go live",
    description: "Start your stream once and broadcast to every connected destination.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Header landing />
      <main>
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(217,119,43,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(217,119,43,0.10),transparent_28%)]" />
          <div className="mx-auto grid w-full max-w-6xl gap-14 px-6 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28">
            <div className="flex flex-col gap-7">
              <p className="inline-flex w-fit items-center rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium tracking-[0.18em] text-muted uppercase">
                Restream alternative
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-balance md:text-7xl">
                Go live everywhere.
                <span className="text-accent"> Keep your keys yours.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted text-pretty">
                Vysl is a lightweight multistreaming studio for creators. Connect
                your RTMP destinations, save them locally, and stream without
                creating an account.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/stream"
                  className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Open stream studio
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium transition hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  See how it works
                </Link>
              </div>
              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                {[
                  { value: "No account", label: "Start instantly" },
                  { value: "LocalStorage", label: "Keys stay on device" },
                  { value: "RTMP", label: "Stream to any platform" },
                ].map((stat) => (
                  <div key={stat.label} className="border-t border-border pt-4">
                    <p className="text-sm font-semibold">{stat.value}</p>
                    <p className="mt-1 text-sm text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl border border-border bg-surface/90 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-sm font-medium">Stream destinations</p>
                    <p className="text-xs text-muted">Saved in this browser</p>
                  </div>
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                    Local only
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "YouTube", status: "Ready", detail: "rtmp://a.rtmp.youtube.com/live2" },
                    { name: "Twitch", status: "Ready", detail: "rtmp://live.twitch.tv/app" },
                    { name: "Custom RTMP", status: "Draft", detail: "Add your own destination" },
                  ].map((dest) => (
                    <div
                      key={dest.name}
                      className="rounded-2xl border border-border bg-background/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{dest.name}</p>
                          <p className="mt-1 font-mono text-xs text-muted">{dest.detail}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            dest.status === "Ready"
                              ? "bg-accent-soft text-accent"
                              : "bg-surface-alt text-muted"
                          }`}
                        >
                          {dest.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-alt/60 p-4">
                  <p className="text-xs font-medium tracking-[0.14em] text-muted uppercase">
                    Privacy by default
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Stream keys are stored in <span className="font-mono text-foreground">localStorage</span>,
                    not in a Vysl account database.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-[0.18em] text-accent uppercase">Features</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
              Everything you need to multistream, nothing you don&apos;t.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-border bg-surface p-6 transition hover:bg-surface-alt/60"
              >
                <div className="mb-4 h-2 w-2 rounded-full bg-accent" />
                <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-3 leading-7 text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-border/70 bg-surface-alt/40"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-[0.18em] text-accent uppercase">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                Set up once. Go live in minutes.
              </h2>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="relative rounded-3xl border border-border bg-background p-6">
                  <p className="font-mono text-sm text-accent">{item.step}</p>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-3 leading-7 text-muted">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
          <div className="grid gap-8 rounded-[2rem] border border-border bg-surface p-8 md:grid-cols-[1fr_auto] md:items-end md:p-10">
            <div className="max-w-2xl">
              <p className="text-sm font-medium tracking-[0.18em] text-accent uppercase">Privacy</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
                Your stream keys belong on your device.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted">
                Vysl is designed around local-first setup. RTMP credentials are
                saved in your browser&apos;s localStorage, so you can move fast
                without handing sensitive keys to another account system.
              </p>
            </div>
            <Link
              href="/stream"
              className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Start streaming
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 Vysl. Multistreaming, without the account baggage.</p>
          <p className="font-mono text-xs">RTMP keys stored in localStorage</p>
        </div>
      </footer>
    </div>
  );
}
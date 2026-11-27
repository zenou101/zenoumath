"use client"

import SculptureHero from "@/components/ui/liquid-sculpture-hero"

const destinations = [
  {
    index: "01",
    title: "Games",
    href: "/",
    description: "Six thousand browser games, four layouts and a shuffle for when you cannot choose.",
  },
  {
    index: "02",
    title: "Books & Manga",
    href: "/books/",
    description: "A small shelf of public-domain books, poetry and official manga readers.",
  },
  {
    index: "03",
    title: "Websites",
    href: "/web/",
    description: "Portals, study tools, media and the few sites that let us frame them.",
  },
]

export default function Home() {
  return (
    <div className="min-h-svh bg-[#08090a] text-[#f1f2f3]">
      <SculptureHero
        brand="ZenouMath"
        navLinks={[
          { label: "Games", href: "/" },
          { label: "Apps", href: "/web/?kind=app" },
          { label: "Books", href: "/books/" },
          { label: "Websites", href: "/web/" },
        ]}
        navCta={{ label: "Favourites", href: "/?fav=1" }}
        eyebrow="Arcade — reading room — small tools"
        headline={"A quieter place\nto play."}
        headlineAccent="to play."
        body="Games, official manga readers and a shelf of public-domain books, arranged without noise. Move through the form and it turns liquid."
        primaryCta={{ label: "Explore the arcade", href: "/" }}
        secondaryCta={{ label: "Open the reading room", href: "/books/" }}
        theme="dark"
        themeToggle={false}
        darkBackground="#08090a"
        backdropText="zenou"
        intro
      />

      <main className="px-5 pt-16 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-baseline justify-between gap-6 border-b border-white/10 pb-5">
            <p className="font-mono text-[10px] font-medium tracking-[0.2em] text-white/35 uppercase">Index</p>
            <p className="text-right text-[12px] text-white/35">Three doors, no noise.</p>
          </div>

          <nav aria-label="Explore ZenouMath" className="grid border-x border-b border-white/10 sm:grid-cols-3">
            {destinations.map((destination) => (
              <a
                key={destination.href}
                href={destination.href}
                className="group border-b border-white/10 p-6 transition-colors last:border-b-0 hover:bg-white/[0.035] sm:border-r sm:border-b-0 sm:p-7 sm:last:border-r-0"
              >
                <span className="font-mono text-[10px] tracking-[0.16em] text-white/30">{destination.index}</span>
                <span className="mt-9 flex items-end justify-between gap-4">
                  <span className="text-[18px] font-medium tracking-[-0.03em]">{destination.title}</span>
                  <span aria-hidden="true" className="text-white/30 transition-transform duration-300 group-hover:translate-x-1">
                    ↗
                  </span>
                </span>
                <span className="mt-2 block max-w-[34ch] text-[12.5px] leading-6 text-white/45">
                  {destination.description}
                </span>
              </a>
            ))}
          </nav>
        </div>
      </main>

      <footer className="px-5 pt-14 pb-14 text-[11px] text-white/35 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0">ZenouMath · a quieter corner of the browser</p>
          <nav aria-label="Site information" className="flex flex-wrap gap-x-5 gap-y-2">
            <a className="text-white/50 transition-colors hover:text-white" href="/web/?kind=app">
              Apps
            </a>
            <a className="text-white/50 transition-colors hover:text-white" href="/?fav=1">
              Favourites
            </a>
            <a className="text-white/50 transition-colors hover:text-white" href="/ui/">
              UI details
            </a>
            <a className="text-white/50 transition-colors hover:text-white" href="/legal/">
              Legal
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

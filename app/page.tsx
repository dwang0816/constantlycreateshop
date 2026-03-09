import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Printer, Layers, Zap } from "lucide-react"
import Link from "next/link"

const services = [
  {
    icon: Printer,
    title: "DTF Gang Sheet Printing",
    description:
      "Upload your design, get an instant price, and check out in minutes. We print and ship direct-to-film transfers.",
    href: "/dtf",
    cta: "Order DTF Prints",
    highlight: true,
  },
  {
    icon: Layers,
    title: "Custom Apparel",
    description:
      "Screen printing, embroidery, DTG, and patches for brands, creators, and businesses of all sizes.",
    href: "/quote",
    cta: "Request a Quote",
    highlight: false,
  },
  {
    icon: Zap,
    title: "Webstore Setup",
    description:
      "We build and manage on-demand merch stores so you can focus on growing your brand.",
    href: "/webstore",
    cta: "Learn More",
    highlight: false,
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navigation />

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Now accepting DTF orders online
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground text-balance mb-6">
            Custom Apparel for{" "}
            <span className="text-primary">Brands, Creators & Businesses</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 text-pretty">
            Premium printing services including DTF gang sheets, screen printing, embroidery, DTG, and patches.
          </p>

          {/* Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {services.map(({ icon: Icon, title, description, href, cta, highlight }) => (
              <div
                key={href}
                className={`rounded-2xl border p-6 flex flex-col gap-4 transition-shadow hover:shadow-md ${
                  highlight
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground mb-2">{title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
                <Button
                  asChild
                  variant={highlight ? "default" : "outline"}
                  className="w-full"
                >
                  <Link href={href}>
                    {cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

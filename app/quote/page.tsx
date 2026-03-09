import { Navigation } from "@/components/navigation"
import { QuoteForm } from "@/components/quote-form"
import { Footer } from "@/components/footer"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Request a Quote | Constantly Create Shop",
  description: "Get a custom quote for screen printing, embroidery, DTG, DTF, or patches. Fast turnaround and competitive pricing.",
}

export default function QuotePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-16">
        <QuoteForm />
      </div>
      <Footer />
    </main>
  )
}

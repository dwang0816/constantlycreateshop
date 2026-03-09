import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, Truck, BarChart3, Palette, Users, ArrowRight, Check } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Webstore | Constantly Create Shop",
  description: "Create your own custom branded online store. Sell custom apparel with inventory management, order fulfillment, and more.",
}

const features = [
  {
    icon: ShoppingCart,
    title: "Your Own Storefront",
    description: "Get a fully customized online store with your branding, domain, and design to sell your merchandise directly to your audience.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "We handle all inventory storage, tracking, and restocking so you can focus on growing your brand and creating content.",
  },
  {
    icon: Truck,
    title: "Order Fulfillment",
    description: "Every order is picked, packed, and shipped by our team. Fast turnaround and professional packaging included.",
  },
  {
    icon: BarChart3,
    title: "Sales Dashboard",
    description: "Track your sales, inventory levels, and customer data in real-time with our easy-to-use dashboard.",
  },
  {
    icon: Palette,
    title: "Custom Merch Design",
    description: "Work with our design team to create unique apparel and products that represent your brand identity.",
  },
  {
    icon: Users,
    title: "Dedicated Support",
    description: "Get personalized support from our team to help you launch and grow your merchandise business.",
  },
]

const included = [
  "Custom branded storefront",
  "Unlimited product listings",
  "Secure checkout & payment processing",
  "Inventory storage & management",
  "Pick, pack & ship fulfillment",
  "Customer service support",
  "Sales analytics dashboard",
  "Mobile-optimized design",
]

export default function WebstorePage() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <span className="h-2 w-2 rounded-full bg-accent" />
              Webstore Solutions
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 text-balance">
              Launch Your Own{" "}
              <span className="text-accent">Branded Merch Store</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 text-pretty">
              We handle everything from production to fulfillment. You focus on your brand, we handle the rest. Perfect for creators, artists, and businesses.
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 py-6">
              <Link href="/contact">
                Start Your Webstore
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mock Storefront Preview */}
      <section className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Example Storefront
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Here&apos;s what your custom branded store could look like.
            </p>
          </div>

          {/* Mock Storefront Card */}
          <Card className="overflow-hidden border-border max-w-4xl mx-auto">
            <div className="bg-card p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/50" />
                <div className="w-3 h-3 rounded-full bg-accent/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-secondary rounded-md px-4 py-1.5 text-sm text-muted-foreground text-center">
                  yourbrand.constantlycreateshop.com
                </div>
              </div>
              <div className="w-16" />
            </div>
            <CardContent className="p-0">
              <div className="bg-background p-8">
                {/* Mock Header */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
                  <span className="text-lg font-bold text-foreground">YOUR BRAND</span>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Shop</span>
                    <span>About</span>
                    <span>Contact</span>
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                </div>
                
                {/* Mock Products Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="group">
                      <div className="aspect-square bg-secondary rounded-lg mb-3 flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Product {i}</p>
                      <p className="text-sm text-muted-foreground">$29.99</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We provide a complete solution for launching and running your merchandise store.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-border bg-card hover:border-accent transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                What&apos;s Included
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Everything you need to run a successful merchandise business, all in one package. No hidden fees, no surprises.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {included.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-foreground text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <Card className="w-full max-w-md border-accent bg-card">
                <CardHeader className="text-center">
                  <CardTitle className="text-foreground">Ready to Start?</CardTitle>
                  <CardDescription>
                    Get in touch with our team to discuss your webstore needs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href="/contact">
                      Contact Us
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Free consultation. No commitment required.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

import Link from "next/link"
import { Instagram, Facebook } from "lucide-react"

const navigation = {
  main: [
    { name: "Home", href: "/" },
    { name: "Request Quote", href: "/quote" },
    { name: "Webstore", href: "/webstore" },
    { name: "Contact", href: "/contact" },
  ],
  services: [
    { name: "Screen Printing", href: "/quote" },
    { name: "Embroidery", href: "/quote" },
    { name: "DTG Printing", href: "/quote" },
    { name: "DTF Printing", href: "/quote" },
    { name: "Patches", href: "/quote" },
  ],
  social: [
    { name: "Instagram", href: "https://www.instagram.com/Constantlycreateshop", icon: Instagram },
    { name: "Facebook", href: "https://www.facebook.com/constantlycreateshop/", icon: Facebook },
  ],
}

export function Footer() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block">
              <span className="text-xl font-bold tracking-tight text-foreground">
                CONSTANTLY CREATE
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Premium custom apparel for brands, creators, and businesses. Quality printing and fast turnaround.
            </p>
            <div className="mt-6 flex gap-4">
              {navigation.social.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={item.name}
                >
                  <item.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Navigation</h3>
            <ul className="space-y-3">
              {navigation.main.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-3">
              {navigation.services.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="mailto:sales@constantlycreateshop.com" className="hover:text-foreground transition-colors">
                  sales@constantlycreateshop.com
                </a>
              </li>
              <li>
                <a href="tel:+15166939695" className="hover:text-foreground transition-colors">
                  (516) 693-9695
                </a>
              </li>
              <li>
                <address className="not-italic">
                  115 Lakeville Road<br />
                  New Hyde Park, NY 11040
                </address>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} Constantly Create Shop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

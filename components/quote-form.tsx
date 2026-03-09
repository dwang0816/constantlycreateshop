"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, X, CheckCircle2 } from "lucide-react"

const serviceTypes = [
  "Screen Printing",
  "Embroidery",
  "DTG (Direct to Garment)",
  "DTF (Direct to Film)",
  "Patches",
]

export function QuoteForm() {
  const [files, setFiles] = useState<File[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <section id="quote" className="py-24 bg-secondary/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Card className="border-accent bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="h-16 w-16 text-accent mb-6" />
              <h3 className="text-2xl font-bold text-foreground mb-2">Quote Request Submitted!</h3>
              <p className="text-muted-foreground mb-6">
                Thank you for your interest. We&apos;ll get back to you within 24-48 hours.
              </p>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="outline"
              >
                Submit Another Request
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section id="quote" className="py-24 bg-secondary/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Request a Quote
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tell us about your project and we&apos;ll get back to you with a custom quote within 24-48 hours.
          </p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Fill out the form below with as much detail as possible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required placeholder="Your full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company / Brand Name *</Label>
                <Input id="company" name="company" required placeholder="Your company or brand" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="garmentTypes">Type of Garments *</Label>
                <Input
                  id="garmentTypes"
                  name="garmentTypes"
                  required
                  placeholder="e.g., T-Shirts, Hoodies, Hats, Shorts, Jackets"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="garmentColors">Color of Garments *</Label>
                <Input
                  id="garmentColors"
                  name="garmentColors"
                  required
                  placeholder="e.g., Black T-Shirts, Grey Hoodies, Navy Hats"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity of Garments *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  required
                  placeholder="e.g., 24 T-Shirts, 12 Hoodies, 36 Hats"
                />
              </div>

              {/* Service Types */}
              <div className="space-y-3">
                <Label>Service Type(s) *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {serviceTypes.map((service) => (
                    <label
                      key={service}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedServices.includes(service)
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <Checkbox
                        checked={selectedServices.includes(service)}
                        onCheckedChange={() => toggleService(service)}
                      />
                      <span className="text-sm text-foreground">{service}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <Label>Upload Artwork or References *</Label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept="image/*,.pdf,.ai,.psd,.eps"
                  />
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports: PNG, JPG, PDF, AI, PSD, EPS
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-secondary rounded-md px-3 py-1.5 text-sm"
                      >
                        <span className="text-foreground truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="completionDate">Requested Completion Date *</Label>
                  <Input
                    id="completionDate"
                    name="completionDate"
                    type="date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fulfillment">Fulfillment Option *</Label>
                  <Select name="fulfillment" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fulfillment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pickup">Pickup</SelectItem>
                      <SelectItem value="shipping">Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="border-t border-border pt-6">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Optional Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="budget">Payment & Budget</Label>
                    <Input
                      id="budget"
                      name="budget"
                      placeholder="Your estimated budget"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentPreference">Payment Preference</Label>
                    <Select name="paymentPreference">
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Pay in Full</SelectItem>
                        <SelectItem value="deposit">50% Deposit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <Label htmlFor="referral">How did you hear about us?</Label>
                  <Select name="referral">
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="social">Social Media</SelectItem>
                      <SelectItem value="search">Google Search</SelectItem>
                      <SelectItem value="referral">Friend/Referral</SelectItem>
                      <SelectItem value="repeat">Repeat Customer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="details">Additional Details</Label>
                  <Textarea
                    id="details"
                    name="details"
                    placeholder="Any other information we should know about your project..."
                    rows={4}
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Get Quote"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

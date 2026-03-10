import { findClosestVariant } from './variants'
import type { GangSheetVariant } from './variants'

export interface CartItem {
  id: string
  filename: string
  variant: GangSheetVariant
  price: number
  quantity: number
  thumbnailUrl: string
  customData: {
    dpi: number
    imgWidth: number
    imgHeight: number
    printWidth: number
    printHeight: number
    rate?: number
    resizedImageBlobUrl?: string | null
  }
}

interface PricingTier {
  min: number
  max: number
  rate: number
}

export const PRICING_TIERS: PricingTier[] = [
  { min: 0,    max: 10,       rate: 0.35 },
  { min: 10,   max: 20,       rate: 0.25 },
  { min: 20,   max: 50,       rate: 0.15 },
  { min: 50,   max: 100,      rate: 0.10 },
  { min: 100,  max: 200,      rate: 0.08 },
  { min: 200,  max: 400,      rate: 0.06 },
  { min: 400,  max: 700,      rate: 0.05 },
  { min: 700,  max: 1000,     rate: 0.04 },
  { min: 1000, max: 2500,     rate: 0.03 },
  { min: 2500, max: Infinity, rate: 0.02 },
]

export function getRate(totalSqIn: number): number {
  return (
    PRICING_TIERS.find(t => totalSqIn >= t.min && totalSqIn < t.max)?.rate ??
    0.02
  )
}

export function repriceCartItems(
  items: CartItem[],
  variants: GangSheetVariant[]
): CartItem[] {
  const totalSqIn = items.reduce((sum, item) => {
    const sqIn = item.customData.printWidth * item.customData.printHeight
    return sum + sqIn * item.quantity
  }, 0)

  const rate = getRate(totalSqIn)

  return items.map(item => {
    const sqIn = item.customData.printWidth * item.customData.printHeight
    const price = +(sqIn * item.quantity * rate).toFixed(2)
    const variant = findClosestVariant(
      item.customData.printWidth,
      item.customData.printHeight,
      variants
    )
    return {
      ...item,
      price,
      variant,
      customData: { ...item.customData, rate },
    }
  })
}

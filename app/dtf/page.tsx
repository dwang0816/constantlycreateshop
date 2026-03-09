import type { Metadata } from 'next'
import { DTFProductPage } from '@/components/dtf/DTFProductPage'

export const metadata: Metadata = {
  title: 'DTF Gang Sheet Printing | Constantly Create Shop',
  description:
    'Upload your PNG or JPEG design at 300 DPI and get instant pricing on direct-to-film gang sheet transfers. Volume discounts applied automatically.',
}

export default function DTFPage() {
  return <DTFProductPage />
}

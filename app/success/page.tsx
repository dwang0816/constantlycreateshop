import type { Metadata } from 'next'
import { SuccessContent } from './SuccessContent'

export const metadata: Metadata = {
  title: 'Order Confirmed | Constantly Create Shop',
}

export default function SuccessPage() {
  return <SuccessContent />
}

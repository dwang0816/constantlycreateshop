import { NextResponse } from 'next/server'
import { GANG_SHEET_VARIANTS } from '@/lib/variants'

export async function GET() {
  return NextResponse.json({ products: GANG_SHEET_VARIANTS })
}

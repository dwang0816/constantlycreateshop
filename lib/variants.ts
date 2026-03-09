export interface GangSheetVariant {
  id: string
  title: string
  price: number
  width: number
  height: number
}

export const GANG_SHEET_VARIANTS: GangSheetVariant[] = [
  { id: 'dtf_22x5',   title: '22"×5"',   price: 3.50,  width: 22, height: 5   },
  { id: 'dtf_22x10',  title: '22"×10"',  price: 5.00,  width: 22, height: 10  },
  { id: 'dtf_22x20',  title: '22"×20"',  price: 8.00,  width: 22, height: 20  },
  { id: 'dtf_22x36',  title: '22"×36"',  price: 12.00, width: 22, height: 36  },
  { id: 'dtf_22x60',  title: '22"×60"',  price: 18.00, width: 22, height: 60  },
  { id: 'dtf_22x100', title: '22"×100"', price: 28.00, width: 22, height: 100 },
  { id: 'dtf_22x200', title: '22"×200"', price: 48.00, width: 22, height: 200 },
  { id: 'dtf_22x300', title: '22"×300"', price: 68.00, width: 22, height: 300 },
]

export function findClosestVariant(
  widthIn: number,
  heightIn: number,
  variants: GangSheetVariant[]
): GangSheetVariant {
  const fits = (v: GangSheetVariant, w: number, h: number) =>
    v.width >= w && v.height >= h

  const sorted = [...variants].sort(
    (a, b) => a.width * a.height - b.width * b.height
  )

  let match = sorted.find(v => fits(v, widthIn, heightIn))
  if (!match) match = sorted.find(v => fits(v, heightIn, widthIn))
  if (!match) match = sorted[sorted.length - 1]

  return match!
}

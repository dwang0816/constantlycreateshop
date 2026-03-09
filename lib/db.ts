import { sql } from '@vercel/postgres'

let initialized = false

async function ensureTable() {
  if (initialized) return
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      stripe_session_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  initialized = true
}

export async function generateOrderNumber(): Promise<string> {
  await ensureTable()
  const result = await sql`
    INSERT INTO orders (order_number)
    VALUES (
      'Order#' || LPAD((
        SELECT COALESCE(MAX(id), 0) + 1 FROM orders
      )::TEXT, 6, '0')
    )
    RETURNING order_number
  `
  return result.rows[0].order_number as string
}

export async function updateOrderSessionId(
  orderNumber: string,
  sessionId: string
): Promise<void> {
  await sql`
    UPDATE orders
    SET stripe_session_id = ${sessionId}
    WHERE order_number = ${orderNumber}
  `
}

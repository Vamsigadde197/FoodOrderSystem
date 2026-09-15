import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const defaultFilePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/orders.json",
)

function filePath() {
  return process.env.ORDERS_DATA_PATH || defaultFilePath
}

async function createPostgresStore() {
  const { default: pg } = await import("pg")
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost")
      ? false
      : { rejectUnauthorized: false },
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      received_at TIMESTAMPTZ
    )
  `)

  return {
    kind: "postgres",
    async loadAll() {
      const result = await pool.query(
        "SELECT payload FROM orders ORDER BY received_at DESC NULLS LAST",
      )
      return result.rows.map((row) => row.payload)
    },
    async upsert(order) {
      await pool.query(
        `INSERT INTO orders (order_id, payload, received_at)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (order_id)
         DO UPDATE SET payload = EXCLUDED.payload, received_at = EXCLUDED.received_at`,
        [
          order.orderId,
          order,
          order.receivedAt || order.createdAt || new Date().toISOString(),
        ],
      )
    },
  }
}

function createFileStore() {
  const target = filePath()

  async function readAll() {
    try {
      const raw = await fs.readFile(target, "utf8")
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      if (error.code === "ENOENT") return []
      throw error
    }
  }

  async function writeAll(orders) {
    await fs.mkdir(path.dirname(target), { recursive: true })
    const temp = `${target}.${process.pid}.tmp`
    await fs.writeFile(temp, JSON.stringify(orders, null, 2))
    await fs.rename(temp, target)
  }

  return {
    kind: "file",
    path: target,
    async loadAll() {
      return readAll()
    },
    async upsert(order) {
      const orders = await readAll()
      const index = orders.findIndex((item) => item.orderId === order.orderId)
      if (index >= 0) orders[index] = order
      else orders.push(order)
      await writeAll(orders)
    },
  }
}

export async function openStore() {
  if (process.env.DATABASE_URL) {
    const store = await createPostgresStore()
    console.log("Order store: PostgreSQL")
    return store
  }
  const store = createFileStore()
  console.log(`Order store: file ${store.path}`)
  return store
}

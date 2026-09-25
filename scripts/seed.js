// Local demo data only: 3 items and a few donations in mixed statuses.
// Never run against production. Skips if items already exist.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import db from '../lib/db.js';
import { createDonation, setDonationStatus } from '../lib/donations.js';

const items = [
  { name: 'Saco de cemento', unit_price_crc: 8000, goal_quantity: 100 },
  { name: 'Lámina de zinc', unit_price_crc: 12000, goal_quantity: 60 },
  { name: 'Varilla de construcción', unit_price_crc: 4500, goal_quantity: null },
];

// [donor_name, donor_phone, [[item index, quantity], ...], final status]
const donations = [
  ['María Pérez', '88887777', [[0, 3], [1, 2]], 'pending'],
  ['José Rodríguez', '8765-4321', [[0, 10]], 'received'],
  ['Ana Jiménez', '70001122', [[1, 5], [2, 20]], 'pending'],
  ['Luis Mora', '60123456', [[0, 7]], 'cancelled'],
  ['Carmen Solís', '83334444', [[2, 12]], 'received'],
];

function assertLocal() {
  const url = process.env.DATABASE_URL || '';
  if (process.env.NODE_ENV === 'production' || /neon\.tech/.test(url)) {
    throw new Error('Refusing to seed: this looks like production.');
  }
}

async function run() {
  assertLocal();

  const existing = await db.query('SELECT COUNT(*)::int AS n FROM items');
  if (existing.rows[0].n > 0) {
    console.log('[seed] Items already exist — skipping.');
    process.exit(0);
  }

  const itemIds = [];
  for (const item of items) {
    const result = await db.query(
      `INSERT INTO items (name, unit_price_crc, goal_quantity)
       VALUES ($1, $2, $3) RETURNING id`,
      [item.name, item.unit_price_crc, item.goal_quantity]
    );
    itemIds.push(result.rows[0].id);
    console.log(`[seed] item: ${item.name}`);
  }

  for (const [donorName, donorPhone, lines, status] of donations) {
    const { id } = await createDonation({
      clientToken: randomUUID(),
      donorName,
      donorPhone,
      lines: lines.map(([index, quantity]) => ({ item_id: itemIds[index], quantity })),
    });
    if (status !== 'pending') await setDonationStatus(id, status);
    console.log(`[seed] donation: ${donorName} (${status})`);
  }

  console.log('[seed] Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});

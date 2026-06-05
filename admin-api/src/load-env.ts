import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const candidates = [
  join(__dirname, '../../.env'),
  join(__dirname, '../../../.env'),
  join(process.cwd(), '.env'),
  join(process.cwd(), '../.env'),
];

for (const path of candidates) {
  if (existsSync(path)) {
    config({ path });
    break;
  }
}

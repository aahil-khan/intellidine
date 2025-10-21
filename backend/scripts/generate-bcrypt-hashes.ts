#!/usr/bin/env node

/**
 * Generate bcrypt hashes for seed data
 * 
 * Usage:
 *   npx ts-node backend/scripts/generate-bcrypt-hashes.ts
 * 
 * This generates bcrypt password hashes that you can use in seed.sql
 */

import * as bcrypt from 'bcrypt';

async function main() {
  const testPassword = 'Password@123';
  
  console.log('\n=== 🔐 Generate Bcrypt Hashes ===\n');
  console.log(`Password: ${testPassword}`);
  console.log(`Rounds: 10\n`);

  const hash = await bcrypt.hash(testPassword, 10);
  
  console.log('Generated hash (copy this to seed.sql):');
  console.log(hash);
  console.log('\nNote: This hash is for the password "Password@123"');
  console.log('For production, use a strong password.\n');
}

main().catch(console.error);

#!/usr/bin/env node

/**
 * Create Staff User Script
 * 
 * Usage:
 *   npm run create-staff-user
 *   
 * This interactive script creates a staff user in the database
 * Prompts for: username, email, password, role
 */

import * as readline from 'readline';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { Role } from '@prisma/client';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n=== 🔐 Create Staff User ===\n');

  try {
    // Get username
    let username = '';
    while (!username) {
      username = await question('Enter username: ');
      if (!username) {
        console.log('❌ Username cannot be empty\n');
        continue;
      }

      // Check if username exists
      const existing = await prisma.user.findUnique({
        where: { username },
      });

      if (existing) {
        console.log(`❌ Username "${username}" already exists\n`);
        username = '';
        continue;
      }
      break;
    }

    // Get email
    let email = '';
    while (!email) {
      email = await question('Enter email: ');
      if (!email) {
        console.log('❌ Email cannot be empty\n');
        continue;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ Invalid email format\n');
        email = '';
        continue;
      }

      // Check if email exists
      const existing = await prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        console.log(`❌ Email "${email}" already exists\n`);
        email = '';
        continue;
      }
      break;
    }

    // Get password
    let password = '';
    while (!password) {
      password = await question('Enter password (min 8 chars): ');
      if (!password) {
        console.log('❌ Password cannot be empty\n');
        continue;
      }

      if (password.length < 8) {
        console.log('❌ Password must be at least 8 characters\n');
        password = '';
        continue;
      }
      break;
    }

    // Get role
    const validRoles = ['MANAGER', 'KITCHEN_STAFF', 'WAITER'];
    let role = '';
    while (!role) {
      console.log('\nSelect role:');
      validRoles.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
      const roleChoice = await question('\nEnter role number (1-3): ');

      const roleIndex = parseInt(roleChoice) - 1;
      if (roleIndex >= 0 && roleIndex < validRoles.length) {
        role = validRoles[roleIndex];
      } else {
        console.log('❌ Invalid role selection\n');
      }
    }

    // Get tenant ID
    const tenantId = '11111111-1111-1111-1111-111111111111'; // Default tenant from seed
    console.log(`\n✓ Using tenant: ${tenantId}`);

    // Hash password
    console.log('\n🔄 Creating user...');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash: passwordHash,
        role: role as Role,
        tenant_id: tenantId,
        is_active: true,
      },
    });

    console.log('\n✅ Staff user created successfully!\n');
    console.log('User Details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Active: ${user.is_active}\n`);

    console.log('You can now login with:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}\n`);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

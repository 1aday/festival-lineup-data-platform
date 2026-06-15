#!/usr/bin/env node

import crypto from 'crypto';

function hashSecret(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomHex(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex').toUpperCase();
}

function arg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] || fallback;
}

const type = arg('type', 'api-key');

if (type === 'api-key') {
  const name = arg('name', 'Client');
  const plan = arg('plan', 'starter');
  const raw = `ADEAPI_${randomHex(12)}`;
  const keyHash = hashSecret(raw);
  const keyPrefix = raw.slice(0, 10);

  console.log('Generated API key');
  console.log('Raw key (store securely):', raw);
  console.log('Hash:', keyHash);
  console.log('Prefix:', keyPrefix);
  console.log('\nSQL:');
  console.log(`INSERT INTO api_keys (key_name, key_prefix, key_hash, plan_id, status)`);
  console.log(`SELECT '${name}', '${keyPrefix}', '${keyHash}', id, 'active' FROM api_plans WHERE code='${plan}';`);
  process.exit(0);
}

if (type === 'access-code') {
  const entitlement = arg('entitlement', 'REPORT_BASIC');
  const maxUses = Number(arg('max-uses', '1'));
  const raw = `ADE-${randomHex(6)}`;
  const codeHash = hashSecret(raw);
  const prefix = raw.slice(0, 8);

  console.log('Generated access code');
  console.log('Raw code (share with customer):', raw);
  console.log('Hash:', codeHash);
  console.log('Prefix:', prefix);
  console.log('\nSQL:');
  console.log(`INSERT INTO access_codes (code_prefix, code_hash, entitlement_type, max_uses, status)`);
  console.log(`VALUES ('${prefix}', '${codeHash}', '${entitlement}', ${maxUses}, 'active');`);
  process.exit(0);
}

if (type === 'widget-key') {
  const name = arg('name', 'Widget Client');
  const plan = arg('plan', 'basic');
  const raw = `ADEWID_${randomHex(10)}`;
  const keyHash = hashSecret(raw);
  const keyPrefix = raw.slice(0, 10);

  console.log('Generated widget key');
  console.log('Raw key (store securely):', raw);
  console.log('Hash:', keyHash);
  console.log('Prefix:', keyPrefix);
  console.log('\nSQL:');
  console.log(`INSERT INTO widget_keys (key_name, key_prefix, key_hash, plan_type, status)`);
  console.log(`VALUES ('${name}', '${keyPrefix}', '${keyHash}', '${plan}', 'active');`);
  process.exit(0);
}

console.error('Unknown --type. Use api-key, access-code, or widget-key.');
process.exit(1);

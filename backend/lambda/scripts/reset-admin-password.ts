#!/usr/bin/env ts-node
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const region = process.env.AWS_REGION || 'ap-southeast-3';
const stage = process.env.STAGE || 'prod';
const service = 'sales-app-api';
const defaultAdminsTable = process.env.ADMINS_TABLE || `${service}-admins-${stage}`;

const raw = new DynamoDBClient({ region });
const db = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});
const sts = new STSClient({ region });

async function resolveAdminsTable() {
  const candidates = Array.from(new Set([
    defaultAdminsTable,
    `${service}-admins-${stage}`,
    `sales-app-admins-${stage}`,
    'sales-app-admins',
  ].filter(Boolean)));

  for (const table of candidates) {
    try {
      await raw.send(new DescribeTableCommand({ TableName: table }));
      return table;
    } catch (error: any) {
      if (error?.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }
  }

  throw new Error(`Admin table not found in region ${region}. Tried: ${candidates.join(', ')}`);
}

async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'dapur123';
  const name = process.argv[4] || 'Administrator';
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  const adminsTable = await resolveAdminsTable();

  const PK = `ADMIN#${username}`;
  const SK = 'PROFILE';
  const now = new Date().toISOString();

  const existing = await db.send(
    new GetCommand({
      TableName: adminsTable,
      Key: { PK, SK },
    }),
  );

  const passwordHash = await bcrypt.hash(password, 10);

  const item = {
    PK,
    SK,
    id: existing.Item?.id || randomUUID(),
    username,
    name,
    password: passwordHash,
    role: existing.Item?.role || 'admin',
    isActive: true,
    createdAt: existing.Item?.createdAt || now,
    updatedAt: now,
  };

  await db.send(
    new PutCommand({
      TableName: adminsTable,
      Item: item,
    }),
  );

  console.log('Admin credential updated successfully');
  console.log('Account:', identity.Account || 'unknown');
  console.log('Region :', region);
  console.log('Table  :', adminsTable);
  console.log('User   :', username);
}

main().catch((error) => {
  console.error('Failed to reset admin password:', error);
  process.exit(1);
});

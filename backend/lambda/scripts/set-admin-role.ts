#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

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
  const role = process.argv[3] || 'super_admin';
  const identity = await sts.send(new GetCallerIdentityCommand({}));
  const adminsTable = await resolveAdminsTable();

  const PK = `ADMIN#${username}`;
  const SK = 'PROFILE';

  const existing = await db.send(
    new GetCommand({
      TableName: adminsTable,
      Key: { PK, SK },
    }),
  );

  if (!existing.Item) {
    throw new Error(`Admin '${username}' not found in table ${adminsTable}`);
  }

  await db.send(
    new UpdateCommand({
      TableName: adminsTable,
      Key: { PK, SK },
      UpdateExpression: 'SET #role = :role, #updatedAt = :updatedAt, #isActive = :isActive',
      ExpressionAttributeNames: {
        '#role': 'role',
        '#updatedAt': 'updatedAt',
        '#isActive': 'isActive',
      },
      ExpressionAttributeValues: {
        ':role': role,
        ':updatedAt': new Date().toISOString(),
        ':isActive': true,
      },
    }),
  );

  console.log('Admin role updated successfully');
  console.log('Account :', identity.Account || 'unknown');
  console.log('Region  :', region);
  console.log('Table   :', adminsTable);
  console.log('User    :', username);
  console.log('Role    :', role);
}

main().catch((error) => {
  console.error('Failed to update admin role:', error);
  process.exit(1);
});
#!/usr/bin/env ts-node
/**
 * Migration script: Export SQLite (Prisma) data → DynamoDB
 *
 * Run AFTER deploying the Lambda stack:
 *   npx ts-node lambda/scripts/migrate-to-dynamodb.ts
 *
 * Requires:
 *   - .env with DATABASE_URL (SQLite) and AWS credentials
 *   - DynamoDB tables already created via `serverless deploy`
 */
export {};
//# sourceMappingURL=migrate-to-dynamodb.d.ts.map
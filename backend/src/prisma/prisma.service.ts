/**
 * @module PrismaService
 * @description NestJS wrapper around Prisma Client with pg pool adapter.
 *
 * Extends PrismaClient (cast to `any` to avoid TS strictness on generated client).
 * Uses @prisma/adapter-pg (pg Pool) for connection pooling — avoids opening
 * a new TCP connection per query under concurrent load.
 *
 * All services access models via `(this.prisma as any).modelName` because
 * the generated client type is not re-exported through the service class type.
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends (PrismaClient as any) implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

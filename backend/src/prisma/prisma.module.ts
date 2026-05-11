/**
 * @module PrismaModule
 * @description Database access layer using Prisma ORM with pg pool adapter.
 *
 * @Global — PrismaService is available in every module without explicit import.
 * Uses @prisma/adapter-pg (connection pool via node-postgres) for better
 * connection management under concurrent load vs the default TCP connector.
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

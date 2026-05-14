/**
 * @module DevModule
 * @description Development tooling module — exposes helpers for the test suite dashboard.
 * Imported unconditionally but all endpoints return 403 in production.
 */
import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';

@Module({
  controllers: [DevController],
  providers: [DevService],
})
export class DevModule {}

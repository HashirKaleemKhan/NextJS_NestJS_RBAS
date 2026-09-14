import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [AuditLogsModule]
})
export class UsersModule {}

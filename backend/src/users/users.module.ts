import { Module } from "@nestjs/common";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersResolver } from "./graphql/users.resolver";

import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersResolver,
  ],
  imports: [AuditLogsModule],
})
export class UsersModule {}
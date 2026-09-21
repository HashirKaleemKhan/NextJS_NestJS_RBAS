import { Module } from "@nestjs/common";

import { AuditLogsController } from "./audit-logs.controller";
import { AuditLogsService } from "./audit-logs.service";
import { AuditLogsResolver } from "./graphql/audit-logs.resolver";

import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [
    AuditLogsController,
  ],
  providers: [
    AuditLogsService,
    AuditLogsResolver,
  ],
  exports: [
    AuditLogsService,
  ],
})
export class AuditLogsModule {}
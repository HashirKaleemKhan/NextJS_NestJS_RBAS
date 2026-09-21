import { Module } from "@nestjs/common";

import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";
import { GroupsResolver } from "./graphql/groups.resolver";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [
    GroupsController,
  ],
  providers: [
    GroupsService,
    GroupsResolver,
  ],
})
export class GroupsModule {}
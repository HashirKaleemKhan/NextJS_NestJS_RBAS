import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolesResolver } from './graphql/roles.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [RolesController],
  providers: [RolesService, RolesResolver],
})
export class RolesModule {}
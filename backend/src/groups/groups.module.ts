import { Module } from "@nestjs/common";

import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";
import { GroupsResolver } from "./graphql/groups.resolver";

import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsResolver],
})
export class GroupsModule {}
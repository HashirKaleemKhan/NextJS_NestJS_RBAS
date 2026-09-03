import { Module } from "@nestjs/common";

import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { PrismaModule } from "../prisma/prisma.module";

import { RolesResolver } from "./graphql/roles.resolver";

@Module({
  imports: [PrismaModule],

  controllers: [
    RolesController,
  ],

  providers: [
    RolesService,
    RolesResolver,
  ],
})
export class RolesModule {}
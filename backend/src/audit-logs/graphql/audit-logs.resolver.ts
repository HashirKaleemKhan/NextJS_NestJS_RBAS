import {
  Args,
  Context,
  Int,
  Query,
  Resolver,
} from "@nestjs/graphql";

import { UseGuards } from "@nestjs/common";

import { AuditLogsService } from "../audit-logs.service";

import {
  AuditLogType,
  AuditLogFiltersType,
  PaginatedAuditLogsType,
} from "./audit-log.types";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

@Resolver(() => AuditLogType)
@UseGuards(JwtAuthGuard)
export class AuditLogsResolver {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Query(() => PaginatedAuditLogsType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("logs.read")
  async auditLogs(
    @Args("page", {
      type: () => Int,
      nullable: true,
    })
    page?: number,

    @Args("limit", {
      type: () => Int,
      nullable: true,
    })
    limit?: number,

    @Args("search", {
      type: () => String,
      nullable: true,
    })
    search?: string,

    @Args("action", {
      type: () => String,
      nullable: true,
    })
    action?: string,

    @Args("entity", {
      type: () => String,
      nullable: true,
    })
    entity?: string,
  ) {
    return this.auditLogsService.findAll({
      page: page ?? 1,
      limit: limit ?? 10,
      search: search ?? "",
      action: action ?? "",
      entity: entity ?? "",
    });
  }

  @Query(() => AuditLogType, {
    nullable: true,
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("logs.read")
  async auditLog(
    @Args("id", {
      type: () => Int,
    })
    id: number,
  ) {
    return this.auditLogsService.findOne(id);
  }

  @Query(() => AuditLogFiltersType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("logs.read")
  async auditLogFilters() {
    return this.auditLogsService.getFilters();
  }
}
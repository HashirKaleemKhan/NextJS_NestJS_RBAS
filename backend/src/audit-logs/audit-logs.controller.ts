import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from "@nestjs/common";

import { AuditLogsService } from "./audit-logs.service";

import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions/permissions.guard";
import { Permissions } from "../common/decorators/permissions.decorator";

@Controller("audit-logs")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @Permissions("logs.read")
  findAll(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("action") action?: string,
    @Query("entity") entity?: string,
  ) {
    return this.auditLogsService.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      action,
      entity,
    });
  }

  @Get("filters")
  @Permissions("logs.read")
  getFilters() {
    return this.auditLogsService.getFilters();
  }

  @Get(":id")
  @Permissions("logs.read")
  findOne(
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.auditLogsService.findOne(id);
  }
}
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";

import { RolesService } from "./roles.service";

import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions/permissions.guard";
import { Permissions } from "../common/decorators/permissions.decorator";

import { UpdateRolePermissionsDto } from "./dto/update-role-permissions.dto";

@Controller("roles")
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
  ) {}

  // -----------------------------------
  // GET ROLES
  // -----------------------------------

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  findAll(@Req() req: any) {
    return this.rolesService.findAll(
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // UPDATE ROLE PERMISSIONS
  // -----------------------------------

  @Patch(":id/permissions")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  updatePermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: any,
  ) {
    return this.rolesService.updatePermissions(
      id,
      dto.permissionIds,
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // GET ALL PERMISSIONS
  // -----------------------------------

  @Get("permissions")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  findAllPermissions(@Req() req: any) {
    return this.rolesService.findAllPermissions(
      Number(req.user.id),
    );
  }
}
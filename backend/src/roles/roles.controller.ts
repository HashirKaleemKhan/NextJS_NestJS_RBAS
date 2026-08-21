import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { RolesService } from "./roles.service";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions/permissions.guard";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CreateRoleDto } from "./dto/create-role.dto";
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
// CREATE ROLE
// -----------------------------------

@Post()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("roles.manage")
create(
  @Body() dto: CreateRoleDto,
  @Req() req: any,
) {
  return this.rolesService.create(
    dto,
    Number(req.user.id),
  );
}

  // -----------------------------------
// UPDATE ROLE
// -----------------------------------

@Patch(":id")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("roles.manage")
update(
  @Param("id", ParseIntPipe) id: number,
  @Body() dto: UpdateRoleDto,
  @Req() req: any,
) {
  return this.rolesService.update(
    id,
    dto,
    Number(req.user.id),
  );
}

// -----------------------------------
// TOGGLE ROLE STATUS
// -----------------------------------

@Patch(":id/status")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("roles.manage")
toggleStatus(
  @Param("id", ParseIntPipe) id: number,
  @Req() req: any,
) {
  return this.rolesService.toggleStatus(
    id,
    Number(req.user.id),
  );
}

// -----------------------------------
// DELETE ROLE
// -----------------------------------

@Delete(":id")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("roles.manage")
remove(
  @Param("id", ParseIntPipe) id: number,
  @Req() req: any,
) {
  return this.rolesService.remove(
    id,
    Number(req.user.id),
  );
}

  // -----------------------------------
// GET ACTIVE GROUPS
// -----------------------------------

@Get("groups")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("roles.manage")
findGroups(@Req() req: any) {
  return this.rolesService.findGroups(
    Number(req.user.id),
  );
}

// -----------------------------------
// GET GROUP PERMISSIONS
// -----------------------------------

@Get("groups/:groupId/permissions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("roles.manage")
findGroupPermissions(
  @Param(
    "groupId",
    ParseIntPipe,
  )
  groupId: number,

  @Req() req: any,
) {
  return this.rolesService.findGroupPermissions(
    groupId,
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
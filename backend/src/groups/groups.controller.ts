import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { GroupsService } from "./groups.service";

import { CreateGroupDto } from "./dto/create-group.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions/permissions.guard";
import { Permissions } from "../common/decorators/permissions.decorator";

@Controller("groups")
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
  ) {}

  // -----------------------------------
  // GET GROUPS
  // -----------------------------------

  @Get()
  @Permissions("roles.manage")
  findAll() {
    return this.groupsService.findAll();
  }

  // -----------------------------------
  // GET ONE GROUP
  // -----------------------------------

  @Get(":id")
  @Permissions("roles.manage")
  findOne(
    @Param("id", ParseIntPipe)
    id: number,
  ) {
    return this.groupsService.findOne(id);
  }
   
  // -----------------------------------
  // CREATE GROUP
  // -----------------------------------

  @Post()
  @Permissions("roles.manage")
  create(
    @Body() dto: CreateGroupDto,
  ) {
    return this.groupsService.create(dto);
  }

  // -----------------------------------
  // UPDATE GROUP
  // -----------------------------------

  @Patch(":id")
  @Permissions("roles.manage")
  update(
    @Param("id", ParseIntPipe)
    id: number,

    @Body() dto: CreateGroupDto,
  ) {
    return this.groupsService.update(
      id,
      dto,
    );
  }

  // -----------------------------------
  // TOGGLE ACTIVE
  // -----------------------------------

  @Patch(":id/status")
  @Permissions("roles.manage")
  toggleStatus(
    @Param("id", ParseIntPipe)
    id: number,
  ) {
    return this.groupsService.toggleStatus(
      id,
    );
  }

  // -----------------------------------
  // DELETE GROUP
  // -----------------------------------

  @Delete(":id")
  @Permissions("roles.manage")
  remove(
    @Param("id", ParseIntPipe)
    id: number,
  ) {
    return this.groupsService.remove(id);
  }
}
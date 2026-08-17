import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";

import { UsersService } from "./users.service";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

import { JwtAuthGuard } from "../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions/permissions.guard";
import { Permissions } from "../common/decorators/permissions.decorator";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // -----------------------------------
  // CREATE USER
  // ADMIN ONLY
  // -----------------------------------

  @Post()
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Permissions("users.create")
create(
  @Body() createUserDto: CreateUserDto,
  @Req() req: any,
) {
  return this.usersService.create(
    createUserDto,
    Number(req.user.id),
  );
}

  // -----------------------------------
  // GET USERS
  // -----------------------------------

  @Get()
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.read")
  findAll(@Req() req: any) {
    return this.usersService.findAll(
      Number(req.user.id),
    );
  }

// -----------------------------------
// ORGANIZATION HIERARCHY
// -----------------------------------

@Get("hierarchy")
@UseGuards(JwtAuthGuard)
getHierarchy(@Req() req: any) {
  return this.usersService.getHierarchy(
    Number(req.user.id),
  );
}

// -----------------------------------
// POSSIBLE MANAGERS FOR NEW USER
// -----------------------------------

@Get("possible-managers-for-role/:roleId")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("users.create")
getPossibleManagersForRole(
  @Param("roleId", ParseIntPipe) roleId: number,
  @Req() req: any,
) {
  return this.usersService.getPossibleManagersForRole(
    roleId,
    Number(req.user.id),
  );
}

  // -----------------------------------
  // POSSIBLE MANAGERS FOR EXISTING USERS
  // -----------------------------------

  @Get(":id/possible-managers")
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.update")
  getPossibleManagers(
    @Param(
      "id",
      ParseIntPipe,
    )
    id: number,

    @Req() req: any,
  ) {
    return this.usersService.getPossibleManagers(
      id,
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // UPDATE
  // -----------------------------------

  @Patch(":id")
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.update")
  update(
    @Param(
      "id",
      ParseIntPipe,
    )
    id: number,

    @Body() updateUserDto: UpdateUserDto,

    @Req() req: any,
  ) {
    return this.usersService.update(
      id,
      updateUserDto,
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // DELETE
  // -----------------------------------

  @Delete(":id")
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.delete")
  remove(
    @Param(
      "id",
      ParseIntPipe,
    )
    id: number,

    @Req() req: any,
  ) {
    return this.usersService.remove(
      id,
      Number(req.user.id),
    );
  }

}
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
  Query,
} from "@nestjs/common";

import { UsersService } from "./users.service";

import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";

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
  // PERMISSIONS: users.create
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
    req,
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
findAll(
  @Req() req: any,
  @Query("page") page?: string,
  @Query("limit") limit?: string,
) {
  return this.usersService.findAll(
    Number(req.user.id),
    page ? Number(page) : 1,
    limit ? Number(limit) : 10,
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
@Permissions(
  "users.create",
  "users.update",
)
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
// GET SINGLE USER
// -----------------------------------

@Get(":id")
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Permissions("users.update")
findOne(
  @Param(
    "id",
    ParseIntPipe,
  )
  id: number,

  @Req() req: any,
) {
  return this.usersService.findOne(
    id,
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
      req,
    );
  }

    // -----------------------------------
  // UPDATE USER STATUS
  // -----------------------------------

  @Patch(":id/status")
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.update")
  updateStatus(
    @Param(
      "id",
      ParseIntPipe,
    )
    id: number,

    @Body() updateUserStatusDto: UpdateUserStatusDto,

    @Req() req: any,
  ) {
    return this.usersService.updateStatus(
      id,
      updateUserStatusDto.active,
      Number(req.user.id),
      req,
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
      req,
    );
  }

}
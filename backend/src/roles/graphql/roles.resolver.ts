import {
  Args,
  Context,
  Int,
  Mutation,
  Query,
  Resolver,
} from "@nestjs/graphql";

import { UseGuards } from "@nestjs/common";

import { plainToInstance } from "class-transformer";

import { RolesService } from "../roles.service";

import {
  RoleType,
  PaginatedRolesType,
  GroupWithPermissionsType,
  GroupPermissionGroupType,
  PermissionType,
} from "./role.types";

import {
  CreateRoleInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "./role.inputs";

import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { UpdateRolePermissionsDto } from "../dto/update-role-permissions.dto";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

@Resolver(() => RoleType)
@UseGuards(JwtAuthGuard)
export class RolesResolver {
  constructor(
    private readonly rolesService: RolesService,
  ) {}

  // -----------------------------------
  // QUERY: ROLES
  // -----------------------------------

  @Query(() => PaginatedRolesType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage", "users.update")
  async roles(
    @Args("page", { type: () => Int, nullable: true })
    page?: number,

    @Args("limit", { type: () => Int, nullable: true })
    limit?: number,

    @Args("search", { type: () => String, nullable: true })
    search?: string,

    @Context() context?: any,
  ) {
    const req = context.req;

    return this.rolesService.findAll(
      Number(req.user.id),
      page ?? 1,
      limit ?? 10,
      search ?? "",
    );
  }

  // -----------------------------------
  // QUERY: ROLE
  // -----------------------------------

  @Query(() => RoleType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async role(
    @Args("id", { type: () => Int })
    id: number,

    @Context() context?: any,
  ) {
    const req = context.req;

    return this.rolesService.findOne(
      id,
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // QUERY: ROLE GROUPS
  // -----------------------------------

  @Query(() => [GroupWithPermissionsType])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async roleGroups(
    @Context() context?: any,
  ) {
    const req = context.req;

    return this.rolesService.findGroups(
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // QUERY: ROLE GROUP PERMISSIONS
  // -----------------------------------

  @Query(() => [GroupPermissionGroupType])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async roleGroupPermissions(
    @Args("groupId", { type: () => Int })
    groupId: number,

    @Context() context?: any,
  ) {
    const req = context.req;

    return this.rolesService.findGroupPermissions(
      groupId,
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // QUERY: ROLE ALL PERMISSIONS
  // -----------------------------------

  @Query(() => [PermissionType])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async roleAllPermissions(
    @Context() context?: any,
  ) {
    const req = context.req;

    return this.rolesService.findAllPermissions(
      Number(req.user.id),
    );
  }

  // -----------------------------------
  // MUTATION: CREATE ROLE
  // -----------------------------------

  @Mutation(() => RoleType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async createRole(
    @Args("input") input: CreateRoleInput,
    @Context() context?: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      CreateRoleDto,
      input,
    );

    return this.rolesService.create(
      dto,
      Number(req.user.id),
      req,
    );
  }

  // -----------------------------------
  // MUTATION: UPDATE ROLE
  // -----------------------------------

  @Mutation(() => RoleType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async updateRole(
    @Args("id", { type: () => Int })
    id: number,

    @Args("input") input: UpdateRoleInput,
    @Context() context?: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      UpdateRoleDto,
      input,
    );

    return this.rolesService.update(
      id,
      dto,
      Number(req.user.id),
      req,
    );
  }

  // -----------------------------------
  // MUTATION: TOGGLE ROLE STATUS
  // -----------------------------------

  @Mutation(() => RoleType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async toggleRoleStatus(
    @Args("id", { type: () => Int })
    id: number,

    @Context() context?: any,
  ) {
    const req = context.req;

    return this.rolesService.toggleStatus(
      id,
      Number(req.user.id),
      req,
    );
  }

  // -----------------------------------
  // MUTATION: UPDATE ROLE PERMISSIONS
  // -----------------------------------

  @Mutation(() => RoleType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async updateRolePermissions(
    @Args("id", { type: () => Int })
    id: number,

    @Args("input") input: UpdateRolePermissionsInput,
    @Context() context?: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      UpdateRolePermissionsDto,
      input,
    );

    return this.rolesService.updatePermissions(
      id,
      dto.permissionIds,
      Number(req.user.id),
      req,
    );
  }

  // -----------------------------------
  // MUTATION: DELETE ROLE
  // -----------------------------------

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async deleteRole(
    @Args("id", { type: () => Int })
    id: number,

    @Context() context?: any,
  ) {
    const req = context.req;

    const result = await this.rolesService.remove(
      id,
      Number(req.user.id),
      req,
    );

    return result.message;
  }
}


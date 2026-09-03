import {
    Args,
  Context,
  Int,
  Mutation,
  Query,
  Resolver,
} from "@nestjs/graphql";

import { RolesService } from "../roles.service";

import {
  GroupPermissionType,
  GroupWithPermissionsType,
  PermissionType,
  RoleDeleteResultType,
  RoleType,
} from "./role.type";

import { CreateRoleDto } from "../dto/create-role.dto";
import { UpdateRoleDto } from "../dto/update-role.dto";
import { UpdateRolePermissionsDto } from "../dto/update-role-permissions.dto";

import { UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

@Resolver(() => RoleType)
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesResolver {
  constructor(
    private readonly rolesService: RolesService,
  ) {}

  // -----------------------------------
  // GET ROLES
  // -----------------------------------

  @Query(() => [RoleType])
  @Permissions("roles.manage")
  roles(@Context() context: any) {
    // TEMPORARY:
    // We will replace this with the
    // authenticated user's ID from GraphQL
    // context once the GraphQL auth context
    // is wired exactly like REST.
    return this.rolesService.findAll(
        Number(context.req.user.id),
    );
  }

  // -----------------------------------
  // GET ONE ROLE
  // -----------------------------------

  @Query(() => RoleType)
  @Permissions("roles.manage")
  role(
    @Args("id", { type: () => Int })
    id: number,
    @Context() context: any
  ) {
    return this.rolesService.findOne(id, 
        Number(context.req.user.id),
    );
  }

  // -----------------------------------
  // GET ACTIVE GROUPS
  // -----------------------------------

  @Query(() => [GroupWithPermissionsType])
  @Permissions("roles.manage")
  groups(@Context() context: any) {
    return this.rolesService.findGroups(
        Number(context.req.user.id),
    );
  }

  // -----------------------------------
  // GET GROUP PERMISSIONS
  // -----------------------------------

  @Query(() => [GroupPermissionType])
  @Permissions("roles.manage")
  groupPermissions(
    @Args("groupId", { type: () => Int })
    groupId: number,
    @Context() context: any
  ) {
    return this.rolesService.findGroupPermissions(
      groupId,
      Number(context.req.user.id),
    );
  }

  // -----------------------------------
  // GET ALL PERMISSIONS
  // -----------------------------------

  @Query(() => [PermissionType])
  @Permissions("roles.manage")
  permissions(@Context() context: any) {
    return this.rolesService.findAllPermissions(
        Number(context.req.user.id),
    );
  }

  // -----------------------------------
  // CREATE ROLE
  // -----------------------------------

  @Mutation(() => RoleType)
  @Permissions("roles.manage")
  createRole(
    @Args("name")
    name: string,

    @Args("groupId", {
      type: () => Int,
      nullable: true,
    })
    groupId: number | null,

    @Args("reportsToRoleId", {
      type: () => Int,
      nullable: true,
    })
    reportsToRoleId: number | null,

    @Args("active", {
  type: () => Boolean,
  nullable: true,
})
active: boolean | null,

@Args("isAdmin", {
  type: () => Boolean,
  nullable: true,
})
isAdmin: boolean | null,

    @Args("permissionIds", {
      type: () => [Int],
      nullable: true,
    })
    permissionIds: number[],
    @Context() context: any,
  ) {
    const dto: CreateRoleDto = {
      name,
      groupId: groupId ?? undefined,
      reportsToRoleId:
        reportsToRoleId ?? undefined,
      active: active ?? undefined,
      isAdmin: isAdmin ?? undefined,
      permissionIds:
        permissionIds ?? undefined,
    };

    return this.rolesService.create(dto, Number(context.req.user.id));
  }

  // -----------------------------------
  // UPDATE ROLE
  // -----------------------------------

  @Mutation(() => RoleType)
@Permissions("roles.manage")
updateRole(
  @Args("id", { type: () => Int })
  id: number,@Context() context: any,

  @Args("name", {
    type: () => String,
    nullable: true,
  })
  name: string | null,

  @Args("groupId", {
    type: () => Int,
    nullable: true,
  })
  groupId: number | null,

  @Args("reportsToRoleId", {
    type: () => Int,
    nullable: true,
  })
  reportsToRoleId: number | null,

  @Args("active", {
    type: () => Boolean,
    nullable: true,
  })
  active: boolean | null,

  @Args("isAdmin", {
    type: () => Boolean,
    nullable: true,
  })
  isAdmin: boolean | null,

  @Args("permissionIds", {
    type: () => [Int],
    nullable: true,
  })
  permissionIds: number[] | null,
) {
  const dto: UpdateRoleDto = {
    ...(name !== null && {
      name,
    }),

    ...(groupId !== null && {
      groupId,
    }),

    ...(reportsToRoleId !== null && {
      reportsToRoleId,
    }),

    ...(active !== null && {
      active,
    }),

    ...(isAdmin !== null && {
      isAdmin,
    }),

    ...(permissionIds !== null && {
      permissionIds,
    }),
  };

  return this.rolesService.update(
    id,
    dto,
    Number(context.req.user.id),
  );
}

  // -----------------------------------
  // TOGGLE ROLE STATUS
  // -----------------------------------

  @Mutation(() => RoleType)
  @Permissions("roles.manage")
  toggleRoleStatus(
    @Args("id", { type: () => Int })
    id: number,
    @Context() context: any,
  ) {
    return this.rolesService.toggleStatus(
      id,
      Number(context.req.user.id),
    );
  }

  // -----------------------------------
  // DELETE ROLE
  // -----------------------------------

  @Mutation(() => RoleDeleteResultType)
  @Permissions("roles.manage")
  deleteRole(
    @Args("id", { type: () => Int })
    id: number,
    @Context() context: any,
  ) {
    return this.rolesService.remove(
      id,
      Number(context.req.user.id),
    );
  }

  // -----------------------------------
  // UPDATE ROLE PERMISSIONS
  // -----------------------------------

  @Mutation(() => RoleType)
  @Permissions("roles.manage")
  updateRolePermissions(
    @Args("id", { type: () => Int })
    id: number,
    @Context() context: any,    @Args("permissionIds", {
      type: () => [Int],
    })
    permissionIds: number[],
  ) {
    return this.rolesService.updatePermissions(
      id,
      permissionIds,
      Number(context.req.user.id),
    );
  }
}
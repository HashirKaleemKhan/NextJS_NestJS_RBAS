import {
  Args,
  Context,
  Int,
  Mutation,
  Query,
  Resolver,
} from "@nestjs/graphql";

import { UseGuards } from "@nestjs/common";

import {
  Field,
  ObjectType,
} from "@nestjs/graphql";

import {
  PossibleManagerType,
  UserType,
  UserRoleType,
  OrganizationHierarchyResultType,
} from "./user.type";

import {
  CreateUserInput,
  UpdateUserInput,
} from "./user.input";

import { UsersService } from "../users.service";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

// -----------------------------------
// DELETE RESULT
// -----------------------------------

@ObjectType()
export class UserDeleteResult {
  @Field()
  message!: string;
}

// -----------------------------------
// USERS RESOLVER
// -----------------------------------

@Resolver(() => UserType)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // -----------------------------------
  // GET USERS
  // -----------------------------------

  @Query(() => [UserType])
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.read")
  async users(
    @Context() context: any,
  ): Promise<UserType[]> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.findAll(
      userId,
    );
  }

  // -----------------------------------
  // GET SINGLE USER
  // -----------------------------------

  @Query(() => UserType)
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.update")
  async user(
    @Args("id", {
      type: () => Int,
    })
    id: number,

    @Context() context: any,
  ): Promise<UserType> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.findOne(
      id,
      userId,
    );
  }

  // -----------------------------------
  // POSSIBLE MANAGERS FOR EXISTING USER
  // -----------------------------------

  @Query(() => [PossibleManagerType])
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.update")
  async possibleManagers(
    @Args("id", {
      type: () => Int,
    })
    id: number,

    @Context() context: any,
  ): Promise<PossibleManagerType[]> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.getPossibleManagers(
      id,
      userId,
    );
  }

// -----------------------------------
// ROLES FOR NEW USER
// -----------------------------------

@Query(() => [UserRoleType])
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Permissions("users.create")
async rolesForUserCreation(
  @Context() context: any,
): Promise<UserRoleType[]> {
  const userId = Number(
    context.req.user.id,
  );

  return this.usersService.findRolesForUserCreation(
    userId,
  );
}

  // -----------------------------------
  // POSSIBLE MANAGERS FOR NEW USER
  // -----------------------------------

  @Query(() => [PossibleManagerType])
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.create")
  async possibleManagersForRole(
    @Args("roleId", {
      type: () => Int,
    })
    roleId: number,

    @Context() context: any,
  ): Promise<PossibleManagerType[]> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.getPossibleManagersForRole(
      roleId,
      userId,
    );
  }

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  @Mutation(() => UserType)
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.create")
  async createUser(
    @Args("input")
    input: CreateUserInput,

    @Context() context: any,
  ): Promise<UserType> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.create(
      input,
      userId,
    );
  }

  // -----------------------------------
  // UPDATE USER
  // -----------------------------------

  @Mutation(() => UserType)
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.update")
  async updateUser(
    @Args("id", {
      type: () => Int,
    })
    id: number,

    @Args("input")
    input: UpdateUserInput,

    @Context() context: any,
  ): Promise<UserType> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.update(
      id,
      input,
      userId,
    );
  }

  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  @Mutation(() => UserDeleteResult)
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions("users.delete")
  async deleteUser(
    @Args("id", {
      type: () => Int,
    })
    id: number,

    @Context() context: any,
  ): Promise<UserDeleteResult> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.remove(
      id,
      userId,
    );
  }

  // -----------------------------------
  // ORGANIZATION HIERARCHY
  // -----------------------------------

  @Query(() => OrganizationHierarchyResultType)
  @UseGuards(JwtAuthGuard)
  async organizationHierarchy(
    @Context() context: any,
  ): Promise<OrganizationHierarchyResultType> {
    const userId = Number(
      context.req.user.id,
    );

    return this.usersService.getHierarchy(
      userId,
    );
  }
}

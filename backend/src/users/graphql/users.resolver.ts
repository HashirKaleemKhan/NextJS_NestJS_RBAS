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

import { UsersService } from "../users.service";

import { UserType, PaginatedUsersType } from "../graphql/user.type";
import { UserHierarchyType } from "../graphql/user-hierarchy.type";

import {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "../graphql/user.inputs";

import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { UpdateUserStatusDto } from "../dto/update-user-status.dto";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions/permissions.guard";

import { Permissions } from "../../common/decorators/permissions.decorator";

@Resolver(() => UserType)
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Query(() => PaginatedUsersType)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("users.read")
async users(
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

  @Context() context?: any,
) {
  const req = context.req;

  const currentUserId =
    Number(req.user.id);

  const result =
    await this.usersService.findAll(
      currentUserId,
      page ?? 1,
      limit ?? 10,
      search ?? "",
    );

  return {
    data: result.data,
    pagination: {
      page:
        result.page ??
        page ??
        1,

      limit:
        result.limit ??
        limit ??
        10,

      total:
        result.total ??
        result.data.length,

      totalPages:
        result.totalPages ??
        Math.ceil(
          (result.total ??
            result.data.length) /
            (result.limit ??
              limit ??
              10),
        ),
    },
  };
}

@Query(() => UserType)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions("users.read")
async user(
  @Args("id", {
    type: () => Int,
  })
  id: number,
  @Context() context: any,
) {
  return this.usersService.findOneForView(id);
}

  @Query(() => [UserHierarchyType])
  async userHierarchy(
    @Context() context: any,
  ) {
    const req = context.req;

    const result =
      await this.usersService.getHierarchy(
        Number(req.user.id),
      );

    return result.hierarchy;
  }

  @Query(() => [UserType])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users.update")
  async possibleManagers(
    @Args("id", {
      type: () => Int,
    })
    id: number,
    @Context() context: any,
  ) {
    const req = context.req;

    return this.usersService.getPossibleManagers(
      id,
      Number(req.user.id),
    );
  }

  @Query(() => [UserType])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    "users.create",
    "users.update",
  )
  async possibleManagersForRole(
    @Args("roleId", {
      type: () => Int,
    })
    roleId: number,
    @Context() context: any,
  ) {
    const req = context.req;

    return this.usersService.getPossibleManagersForRole(
      roleId,
      Number(req.user.id),
    );
  }

  @Mutation(() => UserType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users.create")
  async createUser(
    @Args("input") input: CreateUserInput,
    @Context() context: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      CreateUserDto,
      input,
    );

    return this.usersService.create(
      dto,
      Number(req.user.id),
      req,
    );
  }

  @Mutation(() => UserType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users.update")
  async updateUser(
    @Args("id", {
      type: () => Int,
    })
    id: number,
    @Args("input") input: UpdateUserInput,
    @Context() context: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      UpdateUserDto,
      input,
    );

    return this.usersService.update(
      id,
      dto,
      Number(req.user.id),
      req,
    );
  }

  @Mutation(() => UserType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users.update")
  async updateUserStatus(
    @Args("id", {
      type: () => Int,
    })
    id: number,
    @Args("input")
    input: UpdateUserStatusInput,
    @Context() context: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      UpdateUserStatusDto,
      input,
    );

    return this.usersService.updateStatus(
      id,
      dto.active,
      Number(req.user.id),
      req,
    );
  }

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users.delete")
  async deleteUser(
    @Args("id", {
      type: () => Int,
    })
    id: number,
    @Context() context: any,
  ) {
    const req = context.req;

    const result =
      await this.usersService.remove(
        id,
        Number(req.user.id),
        req,
      );

    return result.message;
  }
}
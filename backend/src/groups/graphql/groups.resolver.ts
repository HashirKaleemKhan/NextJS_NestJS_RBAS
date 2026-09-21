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

import { GroupsService } from "../groups.service";

import {
  GroupType,
  PaginatedGroupsType,
} from "./group.types";

import {
  CreateGroupInput,
  UpdateGroupInput,
} from "./group.inputs";

import { CreateGroupDto } from "../dto/create-group.dto";
import { UpdateGroupDto } from "../dto/update-group.dto";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

@Resolver(() => GroupType)
@UseGuards(JwtAuthGuard)
export class GroupsResolver {
  constructor(
    private readonly groupsService: GroupsService,
  ) {}

  // -----------------------------------
  // QUERY: GROUPS
  // -----------------------------------

  @Query(() => PaginatedGroupsType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async groups(
    @Args("page", { type: () => Int, nullable: true })
    page?: number,

    @Args("limit", { type: () => Int, nullable: true })
    limit?: number,

    @Args("search", { type: () => String, nullable: true })
    search?: string,
  ) {
    return this.groupsService.findAll(
      page ?? 1,
      limit ?? 10,
      search ?? "",
    );
  }

  // -----------------------------------
  // QUERY: GROUP
  // -----------------------------------

  @Query(() => GroupType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async group(
    @Args("id", { type: () => Int })
    id: number,
  ) {
    return this.groupsService.findOne(id);
  }

  // -----------------------------------
  // MUTATION: CREATE GROUP
  // -----------------------------------

  @Mutation(() => GroupType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async createGroup(
    @Args("input") input: CreateGroupInput,
    @Context() context: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      CreateGroupDto,
      input,
    );

    return this.groupsService.create(
      dto,
      Number(req.user.id),
      req,
    );
  }

  // -----------------------------------
  // MUTATION: UPDATE GROUP
  // -----------------------------------

  @Mutation(() => GroupType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async updateGroup(
    @Args("id", { type: () => Int })
    id: number,

    @Args("input") input: UpdateGroupInput,
    @Context() context: any,
  ) {
    const req = context.req;

    const dto = plainToInstance(
      UpdateGroupDto,
      input,
    );

    return this.groupsService.update(
      id,
      dto,
      Number(req.user.id),
      req,
    );
  }

  // -----------------------------------
  // MUTATION: TOGGLE GROUP STATUS
  // -----------------------------------

  @Mutation(() => GroupType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async toggleGroupStatus(
    @Args("id", { type: () => Int })
    id: number,

    @Context() context: any,
  ) {
    const req = context.req;

    return this.groupsService.toggleStatus(
      id,
      Number(req.user.id),
      req,
    );
  }

  // -----------------------------------
  // MUTATION: DELETE GROUP
  // -----------------------------------

  @Mutation(() => String)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async deleteGroup(
    @Args("id", { type: () => Int })
    id: number,

    @Context() context: any,
  ) {
    const req = context.req;

    const result = await this.groupsService.remove(
      id,
      Number(req.user.id),
      req,
    );

    return result.message;
  }
}


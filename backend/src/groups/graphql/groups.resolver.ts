import {
  Args,
  Int,
  Mutation,
  Query,
  Resolver,
} from "@nestjs/graphql";

import { UseGuards } from "@nestjs/common";

import { GroupsService } from "../groups.service";

import {
  CreateGroupDto,
} from "../dto/create-group.dto";

import {
  GroupsDeleteResultType,
  GroupsGraphQLType,
} from "./group.type";

import {
  CreateGroupInput,
  UpdateGroupInput,
} from "./group.input";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth/jwt-auth.guard";
import { PermissionsGuard } from "../../auth/guards/permissions/permissions.guard";
import { Permissions } from "../../common/decorators/permissions.decorator";

@Resolver(() => GroupsGraphQLType)
export class GroupsResolver {
  constructor(
    private readonly groupsService: GroupsService,
  ) {}

  @Query(() => [GroupsGraphQLType])
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async groups(): Promise<GroupsGraphQLType[]> {
    return this.groupsService.findAll();
  }

  @Query(() => GroupsGraphQLType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async group(
    @Args("id", { type: () => Int }) id: number,
  ): Promise<GroupsGraphQLType> {
    return this.groupsService.findOne(id);
  }

  @Mutation(() => GroupsGraphQLType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async createGroup(
    @Args("input") input: CreateGroupInput,
  ): Promise<GroupsGraphQLType> {
    const dto: CreateGroupDto = {
      name: input.name,
      active: input.active,
      permissionIds: input.permissionIds,
    };

    const group = await this.groupsService.create(dto);

    if (!group) {
    throw new Error("Failed to create group");
}

    return group;
  }

  @Mutation(() => GroupsGraphQLType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async updateGroup(
    @Args("id", { type: () => Int }) id: number,
    @Args("input") input: UpdateGroupInput,
  ): Promise<GroupsGraphQLType> {
    return this.groupsService.update(id, {
      name: input.name,
      active: input.active,
      permissionIds: input.permissionIds,
    });
  }

  @Mutation(() => GroupsGraphQLType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async toggleGroupStatus(
    @Args("id", { type: () => Int }) id: number,
  ): Promise<GroupsGraphQLType> {
    return this.groupsService.toggleStatus(id);
  }

  @Mutation(() => GroupsDeleteResultType)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("roles.manage")
  async deleteGroup(
    @Args("id", { type: () => Int }) id: number,
  ): Promise<GroupsDeleteResultType> {
    return this.groupsService.remove(id);
  }
}
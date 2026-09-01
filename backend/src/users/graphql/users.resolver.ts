import {
  Args,
  Context,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';

import { UseGuards } from '@nestjs/common';

import { UserType } from './user.type';
import {
  CreateUserInput,
  UpdateUserInput,
} from './user.input';

import { UsersService } from '../users.service';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ObjectType()
export class UserDeleteResult {
  @Field()
  message!: string;
}

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
  @Permissions('users.read')
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
  // CREATE USER
  // -----------------------------------

  @Mutation(() => UserType)
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('users.create')
  async createUser(
    @Args('input')
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
  @Permissions('users.update')
  async updateUser(
    @Args('id', { type: () => Int })
    id: number,

    @Args('input')
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
  @Permissions('users.delete')
  async deleteUser(
    @Args('id', { type: () => Int })
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
}
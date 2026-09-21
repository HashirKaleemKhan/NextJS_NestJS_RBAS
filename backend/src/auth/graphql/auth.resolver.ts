import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';

import { UseGuards } from '@nestjs/common';

import { AuthService } from '../auth.service';

import {
  LoginInput,
  RegisterInput,
} from './auth.inputs';

import {
  AuthUserType,
  LoginResponseType,
  LogoutResponseType,
} from './auth.types';

import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';

import { JwtAuthGuard } from '../guards/jwt-auth/jwt-auth.guard';

import { plainToInstance } from 'class-transformer';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Mutation(() => AuthUserType)
  async register(
    @Args('input') input: RegisterInput,
  ) {
    const dto = plainToInstance(
      RegisterDto,
      input,
    );

    return this.authService.register(dto);
  }

  @Mutation(() => LoginResponseType)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: any,
  ) {
    const dto = plainToInstance(
      LoginDto,
      input,
    );

    const req = context.req;

    return this.authService.login(
      dto,
      req,
    );
  }

  @Mutation(() => LogoutResponseType)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Context() context: any,
  ) {
    const req = context.req;

    return this.authService.logout(req);
  }

  @Query(() => AuthUserType)
  @UseGuards(JwtAuthGuard)
  async profile(
    @Context() context: any,
  ) {
    return context.req.user;
  }
}
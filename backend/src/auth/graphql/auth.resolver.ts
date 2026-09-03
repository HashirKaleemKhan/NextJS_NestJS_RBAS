import {
  Args,
  Context,
  Mutation,
  Resolver,
} from '@nestjs/graphql';

import { AuthService } from '../auth.service';
import { LoginResultType } from './auth.type';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Mutation(() => LoginResultType)
  login(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    return this.authService.login({
      email,
      password,
    });
  }
}
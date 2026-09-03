import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PermissionsGuard } from './guards/permissions/permissions.guard';

import { AuthController } from './auth.controller';
import { AuthResolver } from './graphql/auth.resolver';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy/jwt.strategy';

@Module({
  imports: [
    UsersModule,

    JwtModule.register({
  secret: 'my-super-secret-key',
  signOptions: {
    expiresIn: '1h',
  },
}),
  ],

  controllers: [AuthController],
  providers: [
  AuthService,
  JwtStrategy,
  PermissionsGuard,
  AuthResolver,
],
})
export class AuthModule {}
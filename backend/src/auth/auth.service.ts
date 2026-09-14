import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../audit-logs/audit-actions';

import * as bcrypt from 'bcrypt';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditLogsService: AuditLogsService,
  ) {}

  async register(registerDto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
      },
    });

    if (exists) {
      throw new ConflictException('Email already exists');
    }

    const userRole = await this.prisma.role.findUnique({
      where: {
        name: 'Developer',
      },
    });

    if (!userRole) {
      throw new Error('Default role not found');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      10,
    );

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
        roleId: userRole.id,
      },

      include: {
        role: true,
      },
    });

    const { password, ...result } = user;

    return result;
  }

  async login(loginDto: LoginDto, req: any) {
  const user = await this.prisma.user.findUnique({
    where: {
      email: loginDto.email,
    },

    include: {
      role: {
        include: {
          group: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const ipAddress =
    req.ip ||
    req.headers['x-forwarded-for'] ||
    null;

  const userAgent =
    req.headers['user-agent'] ||
    null;

  if (!user) {
    await this.auditLogsService.log({
      action: AuditAction.LOGIN_FAILED,
      entity: 'Auth',
      description: `Failed login attempt for ${loginDto.email}`,
      newValues: {
        email: loginDto.email,
      },
      ipAddress,
      userAgent,
    });

    throw new UnauthorizedException(
      'Invalid credentials',
    );
  }

  if (!user.active) {
    await this.auditLogsService.log({
      actorId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entity: 'Auth',
      description:
        'Login failed because user account is inactive',
      newValues: {
        email: user.email,
        reason: 'USER_INACTIVE',
      },
      ipAddress,
      userAgent,
    });

    throw new UnauthorizedException(
      'Your account is currently inactive. Please contact an administrator.',
    );
  }

  if (
    user.role.group &&
    !user.role.group.active
  ) {
    await this.auditLogsService.log({
      actorId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entity: 'Auth',
      description:
        'Login failed because user group is inactive',
      newValues: {
        email: user.email,
        reason: 'GROUP_INACTIVE',
      },
      ipAddress,
      userAgent,
    });

    throw new UnauthorizedException(
      'Your group is inactive. Please contact an administrator.',
    );
  }

  if (!user.role.active) {
    await this.auditLogsService.log({
      actorId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entity: 'Auth',
      description:
        'Login failed because user role is inactive',
      newValues: {
        email: user.email,
        reason: 'ROLE_INACTIVE',
      },
      ipAddress,
      userAgent,
    });

    throw new UnauthorizedException(
      'Your role is currently inactive. Please contact an administrator.',
    );
  }

  const valid = await bcrypt.compare(
    loginDto.password,
    user.password,
  );

  if (!valid) {
    await this.auditLogsService.log({
      actorId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entity: 'Auth',
      entityId: user.id,
      description:
        'Failed login attempt due to invalid credentials',
      newValues: {
        email: user.email,
        reason: 'INVALID_PASSWORD',
      },
      ipAddress,
      userAgent,
    });

    throw new UnauthorizedException(
      'Invalid credentials',
    );
  }

  const permissions = user.role.isAdmin
    ? (
        await this.prisma.permission.findMany({
          select: {
            name: true,
          },
        })
      ).map(
        (permission) => permission.name,
      )
    : user.role.permissions.map(
        (rp) => rp.permission.name,
      );

  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions,
    isAdmin: user.role.isAdmin,
  };

  const token =
    await this.jwtService.signAsync(
      payload,
    );

  await this.auditLogsService.log({
    actorId: user.id,
    action: AuditAction.LOGIN_SUCCESS,
    entity: 'Auth',
    entityId: user.id,
    description:
      `User ${user.name} logged in successfully`,
    newValues: {
      email: user.email,
      role: user.role.name,
    },
    ipAddress,
    userAgent,
  });

  return {
    accessToken: token,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions,
      isAdmin: user.role.isAdmin,
      active: user.active,
    },
  };
}

async logout(req: any) {
  const userId = req.user?.id;

  const ipAddress =
    req.ip ||
    req.headers['x-forwarded-for'] ||
    null;

  const userAgent =
    req.headers['user-agent'] ||
    null;

  await this.auditLogsService.log({
    actorId: userId,
    action: AuditAction.LOGOUT,
    entity: 'Auth',
    entityId: userId,
    description: 'User logged out',
    ipAddress,
    userAgent,
  });

  return {
    message: 'Logged out successfully',
  };
}
}
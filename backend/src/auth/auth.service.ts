import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

import * as bcrypt from 'bcrypt';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

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

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
  where: {
    email: loginDto.email,
  },
  include: {
    role: {
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    },
  },
});

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.role.active) {
  throw new UnauthorizedException(
    'Your role is currently inactive. Please contact an administrator.',
  );
}

    const permissions = user.role.isAdmin
  ? (
      await this.prisma.permission.findMany({
        select: {
          name: true,
        },
      })
    ).map((permission) => permission.name)
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

const token = await this.jwtService.signAsync(payload);

    return {
      accessToken: token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions,
        isAdmin: user.role.isAdmin,
      },
    };
  }
}
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // -----------------------------------
  // VERIFY ADMIN
  // -----------------------------------

  private async verifyAdmin(
    currentUserId: number,
  ) {
    const currentUser =
      await this.prisma.user.findUnique({
        where: {
          id: currentUserId,
        },

        include: {
          role: true,
        },
      });

    if (!currentUser) {
      throw new NotFoundException(
        "Current user not found",
      );
    }

    /*
     * Your hierarchy:
     *
     * Developer  = level 1
     * Supervisor = level 2
     * Manager    = level 3
     * Admin      = level 4
     */

    if (currentUser.role.level !== 4) {
      throw new ForbiddenException(
        "Only administrators can manage roles",
      );
    }

    return currentUser;
  }

  // -----------------------------------
  // GET ROLES
  // -----------------------------------

  async findAll(
    currentUserId: number,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    return this.prisma.role.findMany({
      include: {
        users: true,

        permissions: {
          include: {
            permission: true,
          },
        },
      },

      orderBy: {
        level: "asc",
      },
    });
  }

  // -----------------------------------
  // UPDATE ROLE PERMISSIONS
  // -----------------------------------

  async updatePermissions(
    roleId: number,
    permissionIds: number[],
    currentUserId: number,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    const role =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },
      });

    if (!role) {
      throw new NotFoundException(
        "Role not found",
      );
    }

    /*
     * Make sure every permission actually
     * exists before creating relations.
     */

    if (permissionIds.length > 0) {
      const permissions =
        await this.prisma.permission.findMany({
          where: {
            id: {
              in: permissionIds,
            },
          },

          select: {
            id: true,
          },
        });

      if (
        permissions.length !==
        permissionIds.length
      ) {
        throw new NotFoundException(
          "One or more permissions not found",
        );
      }
    }

    /*
     * Remove current permissions.
     */

    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
      },
    });

    /*
     * Add new permissions.
     */

    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map(
          (permissionId) => ({
            roleId,
            permissionId,
          }),
        ),
      });
    }

    return this.prisma.role.findUnique({
      where: {
        id: roleId,
      },

      include: {
        users: true,

        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  // -----------------------------------
  // GET PERMISSIONS
  // -----------------------------------

  async findAllPermissions(
    currentUserId: number,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    return this.prisma.permission.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }
}
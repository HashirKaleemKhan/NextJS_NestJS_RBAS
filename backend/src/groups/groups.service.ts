import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

import { UpdateGroupDto } from "./dto/update-group.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGroupDto } from "./dto/create-group.dto";

import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../audit-logs/audit-actions";

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // -----------------------------------
  // GET GROUPS
  // -----------------------------------

async findAll(
  page = 1,
  limit = 10,
  search = "",
) {
  const safePage = Math.max(
    1,
    Number(page) || 1,
  );

  const safeLimit = Math.min(
    100,
    Math.max(1, Number(limit) || 10),
  );

  const searchQuery = search.trim();

  const where: any = {};

  if (searchQuery) {
    const normalizedSearch =
      searchQuery.toLowerCase();

    const searchConditions: any[] = [
      {
        name: {
          contains: searchQuery,
          mode: "insensitive",
        },
      },

      {
        permissions: {
          some: {
            permission: {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          },
        },
      },

      {
        roles: {
          some: {
            name: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        },
      },
    ];

    if (normalizedSearch === "active") {
      searchConditions.push({
        active: true,
      });
    }

    if (normalizedSearch === "inactive") {
      searchConditions.push({
        active: false,
      });
    }

    where.OR = searchConditions;
  }

  const skip =
    (safePage - 1) * safeLimit;

  const [groups, total] =
    await Promise.all([
      this.prisma.group.findMany({
        where,

        skip,
        take: safeLimit,

        orderBy: {
          name: "asc",
        },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },

          roles: true,
        },
      }),

      this.prisma.group.count({
        where,
      }),
    ]);

  return {
    data: groups,

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(
        total / safeLimit,
      ),
    },
  };
}


  // -----------------------------------
  // CREATE GROUP
  // -----------------------------------

  async create(
    dto: CreateGroupDto,
    currentUserId: number,
    req: any,
  ) {
    const existingGroup =
      await this.prisma.group.findUnique({
        where: {
          name: dto.name,
        },
      });

    if (existingGroup) {
      throw new ConflictException(
        "Group already exists",
      );
    }

    const group =
      await this.prisma.group.create({
        data: {
          name: dto.name,
          active: dto.active ?? true,
        },
      });

    // -----------------------------------
    // ASSIGN PARENT PERMISSIONS
    // -----------------------------------

    if (
      dto.permissionIds &&
      dto.permissionIds.length > 0
    ) {
      const permissions =
        await this.prisma.permission.findMany({
          where: {
            id: {
              in: dto.permissionIds,
            },
            parentId: null,
          },

          select: {
            id: true,
          },
        });

      if (
        permissions.length !==
        dto.permissionIds.length
      ) {
        throw new ConflictException(
          "Groups can only contain parent permissions",
        );
      }

      await this.prisma.groupPermission.createMany({
        data: dto.permissionIds.map(
          (permissionId) => ({
            groupId: group.id,
            permissionId,
          }),
        ),
      });
    }

    const createdGroup =
      await this.prisma.group.findUnique({
        where: {
          id: group.id,
        },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },

          roles: true,
        },
      });

    if (!createdGroup) {
      throw new NotFoundException(
        "Created group not found",
      );
    }

    // -----------------------------------
    // AUDIT: GROUP CREATED
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action: AuditAction.GROUP_CREATED,
      entity: "Group",
      entityId: createdGroup.id,
      description:
        `Group ${createdGroup.name} was created`,
      newValues: {
        name: createdGroup.name,
        active: createdGroup.active,
        permissions:
          createdGroup.permissions.map(
            (gp) => gp.permission.name,
          ),
      },
      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        null,
      userAgent:
        req.headers["user-agent"] ||
        null,
    });

    return createdGroup;
  }

  // -----------------------------------
  // GET GROUP
  // -----------------------------------

  async findOne(id: number) {
    const group =
      await this.prisma.group.findUnique({
        where: {
          id,
        },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },

          roles: true,
        },
      });

    if (!group) {
      throw new NotFoundException(
        "Group not found",
      );
    }

    return group;
  }

  // -----------------------------------
  // UPDATE GROUP
  // -----------------------------------

  async update(
    id: number,
    dto: UpdateGroupDto,
    currentUserId: number,
    req: any,
  ) {
    const group =
      await this.prisma.group.findUnique({
        where: {
          id,
        },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!group) {
      throw new NotFoundException(
        "Group not found",
      );
    }

    // -----------------------------------
    // CHECK NAME
    // -----------------------------------

    if (
      dto.name &&
      dto.name !== group.name
    ) {
      const existing =
        await this.prisma.group.findUnique({
          where: {
            name: dto.name,
          },
        });

      if (existing) {
        throw new ConflictException(
          "Group already exists",
        );
      }
    }

    // -----------------------------------
    // SAVE OLD PERMISSIONS
    // -----------------------------------

    const oldPermissionNames =
      group.permissions
        .map(
          (gp) => gp.permission.name,
        )
        .sort();

    // -----------------------------------
    // VALIDATE PARENT PERMISSIONS
    // -----------------------------------

    if (
      dto.permissionIds !== undefined
    ) {
      const permissions =
        await this.prisma.permission.findMany({
          where: {
            id: {
              in: dto.permissionIds,
            },

            parentId: null,
          },

          select: {
            id: true,
          },
        });

      if (
        permissions.length !==
        dto.permissionIds.length
      ) {
        throw new ConflictException(
          "Groups can only contain parent permissions",
        );
      }

      await this.prisma.groupPermission.deleteMany({
        where: {
          groupId: id,
        },
      });

      if (
        dto.permissionIds.length > 0
      ) {
        await this.prisma.groupPermission.createMany({
          data: dto.permissionIds.map(
            (permissionId) => ({
              groupId: id,
              permissionId,
            }),
          ),
        });
      }
    }

    // -----------------------------------
    // UPDATE GROUP
    // -----------------------------------

    await this.prisma.group.update({
      where: {
        id,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),
      },
    });

    const updatedGroup =
      await this.prisma.group.findUnique({
        where: {
          id,
        },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },

          roles: true,
        },
      });

    if (!updatedGroup) {
      throw new NotFoundException(
        "Updated group not found",
      );
    }

    // -----------------------------------
    // SAVE NEW PERMISSIONS
    // -----------------------------------

    const newPermissionNames =
      updatedGroup.permissions
        .map(
          (gp) => gp.permission.name,
        )
        .sort();

    const permissionsChanged =
      dto.permissionIds !== undefined &&
      (
        oldPermissionNames.length !==
          newPermissionNames.length ||
        oldPermissionNames.some(
          (permission, index) =>
            permission !==
            newPermissionNames[index],
        )
      );

    // -----------------------------------
    // AUDIT: GROUP UPDATED
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action: AuditAction.GROUP_UPDATED,
      entity: "Group",
      entityId: updatedGroup.id,
      description:
        `Group ${updatedGroup.name} was updated`,
      oldValues: {
        name: group.name,
        active: group.active,
        permissions:
          oldPermissionNames,
      },
      newValues: {
        name: updatedGroup.name,
        active: updatedGroup.active,
        permissions:
          newPermissionNames,
      },
      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        null,
      userAgent:
        req.headers["user-agent"] ||
        null,
    });

    // -----------------------------------
    // AUDIT: GROUP STATUS CHANGED
    // -----------------------------------

    if (
      group.active !==
      updatedGroup.active
    ) {
      await this.auditLogsService.log({
        actorId: currentUserId,
        action:
          AuditAction.GROUP_STATUS_CHANGED,
        entity: "Group",
        entityId: updatedGroup.id,
        description:
          `Group ${updatedGroup.name} status was changed`,
        oldValues: {
          active: group.active,
        },
        newValues: {
          active: updatedGroup.active,
        },
        ipAddress:
          req.ip ||
          req.headers["x-forwarded-for"] ||
          null,
        userAgent:
          req.headers["user-agent"] ||
          null,
      });
    }

    // -----------------------------------
    // AUDIT: GROUP PERMISSIONS CHANGED
    // -----------------------------------

    if (permissionsChanged) {
      await this.auditLogsService.log({
        actorId: currentUserId,
        action:
          AuditAction.GROUP_PERMISSIONS_CHANGED,
        entity: "Group",
        entityId: updatedGroup.id,
        description:
          `Group ${updatedGroup.name} permissions were changed`,
        oldValues: {
          permissions:
            oldPermissionNames,
        },
        newValues: {
          permissions:
            newPermissionNames,
        },
        ipAddress:
          req.ip ||
          req.headers["x-forwarded-for"] ||
          null,
        userAgent:
          req.headers["user-agent"] ||
          null,
      });
    }

    return updatedGroup;
  }

  // -----------------------------------
  // DELETE GROUP
  // -----------------------------------

  async remove(
    id: number,
    currentUserId: number,
    req: any,
  ) {
    const group =
      await this.prisma.group.findUnique({
        where: {
          id,
        },

        include: {
          roles: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!group) {
      throw new NotFoundException(
        "Group not found",
      );
    }

    // Don't allow deleting a group
    // which is currently assigned to roles.

    if (group.roles.length > 0) {
      throw new ConflictException(
        "This group cannot be deleted because roles are assigned to it",
      );
    }

    // -----------------------------------
    // AUDIT BEFORE DELETE
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action: AuditAction.GROUP_DELETED,
      entity: "Group",
      entityId: group.id,
      description:
        `Group ${group.name} was deleted`,
      oldValues: {
        name: group.name,
        active: group.active,
        permissions:
          group.permissions.map(
            (gp) => gp.permission.name,
          ),
      },
      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        null,
      userAgent:
        req.headers["user-agent"] ||
        null,
    });

    await this.prisma.groupPermission.deleteMany({
      where: {
        groupId: id,
      },
    });

    await this.prisma.group.delete({
      where: {
        id,
      },
    });

    return {
      message: "Group deleted successfully",
    };
  }

  // -----------------------------------
  // TOGGLE STATUS
  // -----------------------------------

  async toggleStatus(
    id: number,
    currentUserId: number,
    req: any,
  ) {
    const group =
      await this.prisma.group.findUnique({
        where: { id },
      });

    if (!group) {
      throw new NotFoundException(
        "Group not found",
      );
    }

    const updatedGroup =
      await this.prisma.group.update({
        where: { id },

        data: {
          active: !group.active,
        },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },

          roles: true,
        },
      });

    // -----------------------------------
    // AUDIT: GROUP STATUS CHANGED
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action:
        AuditAction.GROUP_STATUS_CHANGED,
      entity: "Group",
      entityId: updatedGroup.id,
      description:
        `Group ${updatedGroup.name} status was changed`,
      oldValues: {
        active: group.active,
      },
      newValues: {
        active: updatedGroup.active,
      },
      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        null,
      userAgent:
        req.headers["user-agent"] ||
        null,
    });

    return updatedGroup;
  }
}

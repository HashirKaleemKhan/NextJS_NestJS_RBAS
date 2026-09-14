import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { PrismaService } from "../prisma/prisma.service";

import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../audit-logs/audit-actions";

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private auditLogsService: AuditLogsService,
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

    if (!currentUser.role.isAdmin) {
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
  page = 1,
  limit = 10,
) {
  const currentUser =
    await this.prisma.user.findUnique({
      where: {
        id: currentUserId,
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

  if (!currentUser) {
    throw new NotFoundException(
      "Current user not found",
    );
  }

  const canReadRoles =
    currentUser.role.isAdmin ||
    currentUser.role.permissions.some(
      (rolePermission) =>
        rolePermission.permission.name ===
        "users.update",
    ) ||
    currentUser.role.permissions.some(
      (rolePermission) =>
        rolePermission.permission.name ===
        "roles.manage",
    );

  if (!canReadRoles) {
    throw new ForbiddenException(
      "You are not allowed to view roles",
    );
  }

  const safePage = Math.max(
    1,
    Number(page) || 1,
  );

  const safeLimit = Math.min(
    100,
    Math.max(1, Number(limit) || 10),
  );

  const skip =
    (safePage - 1) * safeLimit;

  const [roles, total] =
    await Promise.all([
      this.prisma.role.findMany({
        skip,
        take: safeLimit,

        include: {
          group: true,

          reportsToRole: true,

          subordinateRoles: true,

          users: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },

        orderBy: {
          name: "asc",
        },
      }),

      this.prisma.role.count(),
    ]);

  return {
    data: roles,

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
  // GET ONE ROLE
  // -----------------------------------

  async findOne(
    roleId: number,
    currentUserId: number,
  ) {
    await this.verifyAdmin(currentUserId);

    const role =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },

        include: {
          group: true,

          reportsToRole: true,

          subordinateRoles: true,

          users: {
            include: {
              manager: {
                select: {
                  id: true,
                  name: true,
                  roleId: true,
                },
              },

              role: true,
            },
          },

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!role) {
      throw new NotFoundException(
        "Role not found",
      );
    }

    return role;
  }

  // -----------------------------------
  // CREATE ROLE
  // -----------------------------------

  async create(
    dto: CreateRoleDto,
    currentUserId: number,
    req: any,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    // -----------------------------------
    // CHECK GROUP
    // -----------------------------------

    const group = dto.groupId
      ? await this.prisma.group.findUnique({
          where: {
            id: dto.groupId,
          },

          include: {
            permissions: {
              include: {
                permission: {
                  include: {
                    children: true,
                  },
                },
              },
            },
          },
        })
      : null;

    if (dto.groupId && !group) {
      throw new NotFoundException(
        "Group not found",
      );
    }

    if (group && !group.active) {
      throw new ForbiddenException(
        "Cannot assign an inactive group",
      );
    }

    // -----------------------------------
    // CHECK ROLE NAME
    // -----------------------------------

    const existingRole =
      await this.prisma.role.findUnique({
        where: {
          name: dto.name,
        },
      });

    if (existingRole) {
      throw new ForbiddenException(
        "Role already exists",
      );
    }

    // -----------------------------------
    // CHECK REPORTING ROLE
    // -----------------------------------

    let reportsToRoleId =
      dto.reportsToRoleId ?? null;

    /*
     * Administrator roles are the top
     * of the hierarchy and therefore do
     * not report to another role.
     */
    if (dto.isAdmin === true) {
      reportsToRoleId = null;
    } else {
      /*
       * Every normal role must have a
       * reporting role.
       */
      if (reportsToRoleId === null) {
        throw new ForbiddenException(
          "A non-administrator role must report to another role",
        );
      }

      const reportsToRole =
        await this.prisma.role.findUnique({
          where: {
            id: reportsToRoleId,
          },
        });

      if (!reportsToRole) {
        throw new NotFoundException(
          "Reporting role not found",
        );
      }

      if (!reportsToRole.active) {
        throw new ForbiddenException(
          "Cannot report to an inactive role",
        );
      }
    }

    // -----------------------------------
    // VALIDATE PERMISSIONS
    // -----------------------------------

    if (
      dto.permissionIds &&
      dto.permissionIds.length > 0
    ) {
      if (!group) {
        throw new ForbiddenException(
          "A group is required when assigning permissions",
        );
      }

      const allowedPermissionIds =
        group.permissions.flatMap(
          (groupPermission) =>
            groupPermission.permission.children.map(
              (child) => child.id,
            ),
        );

      const invalidPermissionIds =
        dto.permissionIds.filter(
          (permissionId) =>
            !allowedPermissionIds.includes(
              permissionId,
            ),
        );

      if (
        invalidPermissionIds.length > 0
      ) {
        throw new ForbiddenException(
          "One or more permissions are not available for this group",
        );
      }
    }

    // -----------------------------------
    // CREATE ROLE
    // -----------------------------------

    const role =
      await this.prisma.role.create({
        data: {
          name: dto.name,

          groupId:
            dto.groupId ?? null,

          reportsToRoleId,

          active:
            dto.active ?? true,

          isAdmin:
            dto.isAdmin ?? false,
        },
      });

    // -----------------------------------
    // ASSIGN PERMISSIONS
    // -----------------------------------

    if (
      dto.permissionIds &&
      dto.permissionIds.length > 0
    ) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map(
          (permissionId) => ({
            roleId: role.id,
            permissionId,
          }),
        ),
      });
    }

    // -----------------------------------
    // GET CREATED ROLE
    // -----------------------------------

    const createdRole =
      await this.prisma.role.findUnique({
        where: {
          id: role.id,
        },

        include: {
          group: true,

          reportsToRole: true,

          subordinateRoles: true,

          users: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!createdRole) {
      throw new NotFoundException(
        "Created role not found",
      );
    }

    // -----------------------------------
    // AUDIT ROLE CREATED
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action: AuditAction.ROLE_CREATED,
      entity: "Role",
      entityId: createdRole.id,
      description:
        `Role ${createdRole.name} was created`,

      newValues: {
        name: createdRole.name,
        group:
          createdRole.group?.name ??
          null,
        reportsToRole:
          createdRole.reportsToRole?.name ??
          null,
        active: createdRole.active,
        isAdmin: createdRole.isAdmin,
        permissions:
          createdRole.permissions.map(
            (rolePermission) =>
              rolePermission.permission.name,
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

    return createdRole;
  }

  // -----------------------------------
  // UPDATE ROLE
  // -----------------------------------

  async update(
    roleId: number,
    dto: UpdateRoleDto,
    currentUserId: number,
    req: any,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    // -----------------------------------
    // FIND ROLE
    // -----------------------------------

    const role =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },

        include: {
          users: true,

          group: true,

          reportsToRole: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!role) {
      throw new NotFoundException(
        "Role not found",
      );
    }

    // -----------------------------------
    // PROTECT OWN ADMIN ACCESS
    // -----------------------------------

    if (
      role.isAdmin &&
      role.users.some(
        (user) =>
          user.id === currentUserId,
      ) &&
      dto.isAdmin === false
    ) {
      throw new ForbiddenException(
        "You cannot remove administrator access from your own account",
      );
    }

    // -----------------------------------
    // CHECK ROLE NAME
    // -----------------------------------

    if (dto.name !== undefined) {
      const existingRole =
        await this.prisma.role.findFirst({
          where: {
            name: dto.name,

            NOT: {
              id: roleId,
            },
          },
        });

      if (existingRole) {
        throw new ForbiddenException(
          "Role already exists",
        );
      }
    }

    // -----------------------------------
    // CHECK GROUP
    // -----------------------------------

    const targetGroupId =
      dto.groupId !== undefined
        ? dto.groupId
        : role.groupId;

    const group =
      targetGroupId !== null &&
      targetGroupId !== undefined
        ? await this.prisma.group.findUnique({
            where: {
              id: targetGroupId,
            },

            include: {
              permissions: {
                include: {
                  permission: {
                    include: {
                      children: true,
                    },
                  },
                },
              },
            },
          })
        : null;

    if (
      targetGroupId !== null &&
      targetGroupId !== undefined &&
      !group
    ) {
      throw new NotFoundException(
        "Group not found",
      );
    }

    if (group && !group.active) {
      throw new ForbiddenException(
        "Cannot assign an inactive group",
      );
    }

    // -----------------------------------
    // VALIDATE CHILD PERMISSIONS
    // -----------------------------------

    if (
      dto.permissionIds !== undefined &&
      dto.permissionIds.length > 0
    ) {
      if (!group) {
        throw new ForbiddenException(
          "A group is required when assigning permissions",
        );
      }

      const allowedPermissionIds =
        group.permissions.flatMap(
          (groupPermission) =>
            groupPermission.permission.children.map(
              (child) => child.id,
            ),
        );

      const invalidPermissionIds =
        dto.permissionIds.filter(
          (permissionId) =>
            !allowedPermissionIds.includes(
              permissionId,
            ),
        );

      if (
        invalidPermissionIds.length > 0
      ) {
        throw new ForbiddenException(
          "One or more permissions are not available for this group",
        );
      }
    }

    // -----------------------------------
    // DETERMINE ADMIN STATUS
    // -----------------------------------

    const targetIsAdmin =
      dto.isAdmin !== undefined
        ? dto.isAdmin
        : role.isAdmin;

    // -----------------------------------
    // CHECK ADMIN ACTIVE STATUS
    // -----------------------------------

    if (
      targetIsAdmin &&
      dto.active === false
    ) {
      throw new ForbiddenException(
        "Administrator roles must remain active",
      );
    }

    // -----------------------------------
    // CHECK REPORTING ROLE
    // -----------------------------------

    const oldReportsToRoleId =
      role.reportsToRoleId;

    let reportsToRoleId =
      dto.reportsToRoleId !== undefined
        ? dto.reportsToRoleId
        : role.reportsToRoleId;

    if (targetIsAdmin) {
      reportsToRoleId = null;
    } else {
      if (reportsToRoleId === null) {
        throw new ForbiddenException(
          "A non-administrator role must report to another role",
        );
      }

      if (
        reportsToRoleId === roleId
      ) {
        throw new ForbiddenException(
          "A role cannot report to itself",
        );
      }

      const reportsToRole =
        await this.prisma.role.findUnique({
          where: {
            id: reportsToRoleId,
          },
        });

      if (!reportsToRole) {
        throw new NotFoundException(
          "Reporting role not found",
        );
      }

      if (!reportsToRole.active) {
        throw new ForbiddenException(
          "Cannot report to an inactive role",
        );
      }
    }

    // -----------------------------------
    // UPDATE ROLE DETAILS
    // -----------------------------------

    await this.prisma.role.update({
      where: {
        id: roleId,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.active !== undefined && {
          active: dto.active,
        }),

        ...(dto.isAdmin !== undefined && {
          isAdmin: dto.isAdmin,
        }),

        reportsToRoleId,

        ...(targetIsAdmin
          ? {
              groupId: null,
            }
          : dto.groupId !== undefined
            ? {
                groupId: dto.groupId,
              }
            : {}),
      },
    });

    // -----------------------------------
    // CLEAN UP INVALID USER MANAGERS
    // -----------------------------------

    if (
      oldReportsToRoleId !==
      reportsToRoleId
    ) {
      const affectedUsers =
        await this.prisma.user.findMany({
          where: {
            roleId,

            managerId: {
              not: null,
            },
          },

          include: {
            manager: {
              select: {
                roleId: true,
              },
            },
          },
        });

      for (const user of affectedUsers) {
        if (
          !user.manager ||
          user.manager.roleId !==
            reportsToRoleId
        ) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },

            data: {
              managerId: null,
            },
          });
        }
      }
    }

    // -----------------------------------
    // UPDATE PERMISSIONS
    // -----------------------------------

    if (targetIsAdmin) {
      await this.prisma.rolePermission.deleteMany({
        where: {
          roleId,
        },
      });
    } else if (
      dto.permissionIds !== undefined
    ) {
      await this.prisma.rolePermission.deleteMany({
        where: {
          roleId,
        },
      });

      if (dto.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissionIds.map(
            (permissionId) => ({
              roleId,
              permissionId,
            }),
          ),
        });
      }
    }

    // -----------------------------------
    // GET UPDATED ROLE
    // -----------------------------------

    const updatedRole =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },

        include: {
          group: true,

          reportsToRole: true,

          subordinateRoles: true,

          users: {
            include: {
              manager: {
                select: {
                  id: true,
                  name: true,
                  roleId: true,
                },
              },

              role: true,
            },
          },

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!updatedRole) {
      throw new NotFoundException(
        "Updated role not found",
      );
    }

    // -----------------------------------
    // ROLE UPDATED AUDIT
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action: AuditAction.ROLE_UPDATED,
      entity: "Role",
      entityId: updatedRole.id,
      description:
        `Role ${updatedRole.name} was updated`,

      oldValues: {
        name: role.name,
        group:
          role.group?.name ??
          null,
        reportsToRole:
          role.reportsToRole?.name ??
          null,
        active: role.active,
        isAdmin: role.isAdmin,
      },

      newValues: {
        name: updatedRole.name,
        group:
          updatedRole.group?.name ??
          null,
        reportsToRole:
          updatedRole.reportsToRole?.name ??
          null,
        active: updatedRole.active,
        isAdmin: updatedRole.isAdmin,
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
    // ROLE STATUS CHANGED AUDIT
    // -----------------------------------

    if (
      role.active !==
      updatedRole.active
    ) {
      await this.auditLogsService.log({
        actorId: currentUserId,
        action:
          AuditAction.ROLE_STATUS_CHANGED,
        entity: "Role",
        entityId: updatedRole.id,
        description:
          `Role ${updatedRole.name} status was changed`,

        oldValues: {
          active: role.active,
        },

        newValues: {
          active: updatedRole.active,
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
    // ROLE PERMISSIONS CHANGED AUDIT
    // -----------------------------------

    const oldPermissionNames =
      role.permissions
        .map(
          (rolePermission) =>
            rolePermission.permission.name,
        )
        .sort();

    const newPermissionNames =
      updatedRole.permissions
        .map(
          (rolePermission) =>
            rolePermission.permission.name,
        )
        .sort();

    const permissionsChanged =
      oldPermissionNames.length !==
        newPermissionNames.length ||
      oldPermissionNames.some(
        (permission, index) =>
          permission !==
          newPermissionNames[index],
      );

    if (permissionsChanged) {
      await this.auditLogsService.log({
        actorId: currentUserId,
        action:
          AuditAction.ROLE_PERMISSIONS_CHANGED,
        entity: "Role",
        entityId: updatedRole.id,
        description:
          `Role ${updatedRole.name} permissions were changed`,

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

    return updatedRole;
  }

  // -----------------------------------
  // TOGGLE ROLE STATUS
  // -----------------------------------

  async toggleStatus(
    roleId: number,
    currentUserId: number,
    req: any,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    const role =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },

        include: {
          group: true,
        },
      });

    if (!role) {
      throw new NotFoundException(
        "Role not found",
      );
    }

    if (role.isAdmin) {
      throw new ForbiddenException(
        "Administrator roles cannot be deactivated",
      );
    }

    const updatedRole =
      await this.prisma.role.update({
        where: {
          id: roleId,
        },

        data: {
          active: !role.active,
        },

        include: {
          group: true,

          reportsToRole: true,

          subordinateRoles: true,

          users: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    // -----------------------------------
    // ROLE STATUS CHANGED AUDIT
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action:
        AuditAction.ROLE_STATUS_CHANGED,
      entity: "Role",
      entityId: updatedRole.id,
      description:
        `Role ${updatedRole.name} status was changed`,

      oldValues: {
        active: role.active,
      },

      newValues: {
        active: updatedRole.active,
      },

      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        null,

      userAgent:
        req.headers["user-agent"] ||
        null,
    });

    return updatedRole;
  }

  // -----------------------------------
  // DELETE ROLE
  // -----------------------------------

  async remove(
    roleId: number,
    currentUserId: number,
    req: any,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    const role =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },

        include: {
          users: true,

          group: true,

          reportsToRole: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!role) {
      throw new NotFoundException(
        "Role not found",
      );
    }

    // -----------------------------------
    // PROTECT ADMIN ROLES
    // -----------------------------------

    if (role.isAdmin) {
      throw new ForbiddenException(
        "Administrator roles cannot be deleted",
      );
    }

    // -----------------------------------
    // PROTECT ROLES WITH USERS
    // -----------------------------------

    if (role.users.length > 0) {
      throw new ForbiddenException(
        "Cannot delete a role that has users assigned to it",
      );
    }

    // -----------------------------------
    // AUDIT ROLE DELETED
    // -----------------------------------

    await this.auditLogsService.log({
      actorId: currentUserId,
      action: AuditAction.ROLE_DELETED,
      entity: "Role",
      entityId: role.id,
      description:
        `Role ${role.name} was deleted`,

      oldValues: {
        name: role.name,
        group:
          role.group?.name ??
          null,
        reportsToRole:
          role.reportsToRole?.name ??
          null,
        active: role.active,
        isAdmin: role.isAdmin,
        permissions:
          role.permissions.map(
            (rolePermission) =>
              rolePermission.permission.name,
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

    // -----------------------------------
    // DELETE ROLE
    // -----------------------------------

    await this.prisma.role.delete({
      where: {
        id: roleId,
      },
    });

    return {
      message: "Role deleted successfully",
    };
  }

  // -----------------------------------
  // GET ACTIVE GROUPS
  // -----------------------------------

  async findGroups(
    currentUserId: number,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    return this.prisma.group.findMany({
      where: {
        active: true,
      },

      orderBy: {
        name: "asc",
      },

      include: {
        permissions: {
          include: {
            permission: {
              include: {
                children: true,
              },
            },
          },
        },
      },
    });
  }

  // -----------------------------------
  // GET CHILD PERMISSIONS FOR GROUP
  // -----------------------------------

  async findGroupPermissions(
    groupId: number,
    currentUserId: number,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    const group =
      await this.prisma.group.findUnique({
        where: {
          id: groupId,
        },

        include: {
          permissions: {
            include: {
              permission: {
                include: {
                  children: true,
                },
              },
            },
          },
        },
      });

    if (!group) {
      throw new NotFoundException(
        "Group not found",
      );
    }

    return group.permissions.map(
      (groupPermission) => ({
        id:
          groupPermission.permission.id,

        name:
          groupPermission.permission.name,

        children:
          groupPermission.permission.children,
      }),
    );
  }

  // -----------------------------------
  // UPDATE ROLE PERMISSIONS
  // -----------------------------------

  async updatePermissions(
    roleId: number,
    permissionIds: number[],
    currentUserId: number,
    req: any,
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    const role =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },

        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!role) {
      throw new NotFoundException(
        "Role not found",
      );
    }

    // -----------------------------------
    // VALIDATE PERMISSIONS
    // -----------------------------------

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

    // -----------------------------------
    // CAPTURE OLD PERMISSIONS
    // -----------------------------------

    const oldPermissionNames =
      role.permissions
        .map(
          (rolePermission) =>
            rolePermission.permission.name,
        )
        .sort();

    // -----------------------------------
    // REMOVE CURRENT PERMISSIONS
    // -----------------------------------

    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId,
      },
    });

    // -----------------------------------
    // ADD NEW PERMISSIONS
    // -----------------------------------

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

    // -----------------------------------
    // GET UPDATED ROLE
    // -----------------------------------

    const updatedRole =
      await this.prisma.role.findUnique({
        where: {
          id: roleId,
        },

        include: {
          group: true,

          reportsToRole: true,

          subordinateRoles: true,

          users: true,

          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

    if (!updatedRole) {
      throw new NotFoundException(
        "Updated role not found",
      );
    }

    // -----------------------------------
    // NEW PERMISSIONS
    // -----------------------------------

    const newPermissionNames =
      updatedRole.permissions
        .map(
          (rolePermission) =>
            rolePermission.permission.name,
        )
        .sort();

    // -----------------------------------
    // AUDIT ROLE PERMISSIONS CHANGED
    // -----------------------------------

    const permissionsChanged =
      oldPermissionNames.length !==
        newPermissionNames.length ||
      oldPermissionNames.some(
        (permission, index) =>
          permission !==
          newPermissionNames[index],
      );

    if (permissionsChanged) {
      await this.auditLogsService.log({
        actorId: currentUserId,
        action:
          AuditAction.ROLE_PERMISSIONS_CHANGED,
        entity: "Role",
        entityId: updatedRole.id,
        description:
          `Role ${updatedRole.name} permissions were changed`,

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

    return updatedRole;
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
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { CreateRoleDto } from "./dto/create-role.dto";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateRoleDto } from "./dto/update-role.dto";

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
  ) {
    await this.verifyAdmin(
      currentUserId,
    );

    return this.prisma.role.findMany({
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
    });
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

      /*
       * Get every child permission that is
       * allowed by this group's parent
       * permissions.
       */

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
    // RETURN CREATED ROLE
    // -----------------------------------

    return this.prisma.role.findUnique({
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
  }

  // -----------------------------------
// UPDATE ROLE
// -----------------------------------

async update(
  roleId: number,
  dto: UpdateRoleDto,
  currentUserId: number,
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

  /*
   * Administrator roles cannot report
   * to another role.
   */
  if (targetIsAdmin) {
    reportsToRoleId = null;
  } else {
    /*
     * Normal roles must have a
     * reporting role.
     */
    if (reportsToRoleId === null) {
      throw new ForbiddenException(
        "A non-administrator role must report to another role",
      );
    }

    /*
     * A role cannot report to itself.
     */
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

      /*
       * Administrator roles do not
       * belong to groups.
       */
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

  /*
   * If this role's reporting role changed,
   * existing users under this role may now
   * have invalid managers.
   *
   * Example:
   *
   * Employee Role
   * reportsToRole = Manager
   *
   * User:
   * Employee 1 -> Manager A
   *
   * Change:
   * Employee Role
   * reportsToRole = CEO
   *
   * Manager A is no longer valid, so:
   *
   * Employee 1 -> null
   */

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
      /*
       * The user's manager must have the
       * newly selected reporting role.
       *
       * If not, remove the manager.
       */
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
  // RETURN UPDATED ROLE
  // -----------------------------------

  return this.prisma.role.findUnique({
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
}

  // -----------------------------------
  // TOGGLE ROLE STATUS
  // -----------------------------------

  async toggleStatus(
    roleId: number,
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

    if (role.isAdmin) {
      throw new ForbiddenException(
        "Administrator roles cannot be deactivated",
      );
    }

    return this.prisma.role.update({
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
  }

  // -----------------------------------
  // DELETE ROLE
  // -----------------------------------

  async remove(
    roleId: number,
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

        include: {
          users: true,
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
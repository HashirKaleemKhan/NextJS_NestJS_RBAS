import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AuditAction } from "../audit-logs/audit-actions";

import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(
  private prisma: PrismaService,
  private auditLogsService: AuditLogsService,
) {}

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  async create(
  createUserDto: CreateUserDto,
  currentUserId: number,
  req: any,
) {
  // -----------------------------------
  // VERIFY CURRENT USER
  // -----------------------------------

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

  // -----------------------------------
  // CHECK CREATE PERMISSION
  // -----------------------------------

  const canCreateUsers =
    currentUser.role.isAdmin ||
    currentUser.role.permissions.some(
      (rolePermission) =>
        rolePermission.permission.name ===
        "users.create",
    );

  if (!canCreateUsers) {
    throw new ForbiddenException(
      "You are not allowed to create users",
    );
  }

  // -----------------------------------
  // CHECK EMAIL
  // -----------------------------------

  const existingUser =
    await this.prisma.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });

  if (existingUser) {
    throw new ConflictException(
      "Email already exists",
    );
  }

  // -----------------------------------
  // GET SELECTED ROLE
  // -----------------------------------

  const role =
    await this.prisma.role.findUnique({
      where: {
        id: createUserDto.roleId,
      },

      include: {
        reportsToRole: true,
        group: true,
      },
    });

  if (!role) {
    throw new NotFoundException(
      "Selected role not found",
    );
  }

  // -----------------------------------
  // NON-ADMIN CANNOT CREATE ADMIN
  // -----------------------------------

  if (
    role.isAdmin &&
    !currentUser.role.isAdmin
  ) {
    throw new ForbiddenException(
      "Only administrators can create administrator users",
    );
  }

  // -----------------------------------
  // MANAGER ACCESS
  // -----------------------------------

  const accessibleUserIds =
    await this.getAccessibleUserIds(
      currentUserId,
    );

  // -----------------------------------
  // DETERMINE MANAGER
  // -----------------------------------

  let managerId:
    | number
    | null
    | undefined =
    createUserDto.managerId;

  // -----------------------------------
  // ADMINISTRATOR
  // -----------------------------------

  if (role.isAdmin) {
    managerId = null;
  }

  // -----------------------------------
  // TOP-LEVEL NON-ADMIN ROLE
  // -----------------------------------

  else if (
    role.reportsToRoleId === null
  ) {
    managerId = null;
  }

  // -----------------------------------
  // ROLE HAS REPORTING ROLE
  // -----------------------------------

  else {
    if (
      managerId === undefined ||
      managerId === null
    ) {
      managerId = null;
    } else {
      // -----------------------------------
      // GET MANAGER
      // -----------------------------------

      const manager =
        await this.prisma.user.findUnique({
          where: {
            id: managerId,
          },

          include: {
            role: true,
          },
        });

      if (!manager) {
        throw new NotFoundException(
          "Selected manager not found",
        );
      }

      // -----------------------------------
      // MANAGER ACCESS
      // -----------------------------------

      if (
        !currentUser.role.isAdmin &&
        !accessibleUserIds.includes(
          manager.id,
        )
      ) {
        throw new ForbiddenException(
          "You are not allowed to assign this manager",
        );
      }

      // -----------------------------------
      // MANAGER ROLE VALIDATION
      // -----------------------------------

      if (
        manager.role.id !==
        role.reportsToRoleId
      ) {
        throw new ForbiddenException(
          "Selected manager does not have the required reporting role",
        );
      }

      // -----------------------------------
      // MANAGER ACTIVE
      // -----------------------------------

      if (!manager.active) {
        throw new ForbiddenException(
          "Cannot assign a user to an inactive user",
        );
      }

      // -----------------------------------
      // MANAGER ROLE ACTIVE
      // -----------------------------------

      if (!manager.role.active) {
        throw new ForbiddenException(
          "Cannot assign a user to someone with an inactive role",
        );
      }
    }
  }

  // -----------------------------------
  // HASH PASSWORD
  // -----------------------------------

  const hashedPassword =
    await bcrypt.hash(
      createUserDto.password,
      10,
    );

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  const createdUser =
    await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        roleId: createUserDto.roleId,
        managerId,
      },

      include: {
        role: {
          include: {
            group: true,
          },
        },

        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  // -----------------------------------
  // AUDIT LOG
  // -----------------------------------

  await this.auditLogsService.log({
    actorId: currentUserId,
    action: AuditAction.USER_CREATED,
    entity: "User",
    entityId: createdUser.id,
    description:
      `User ${createdUser.name} was created`,
    newValues: {
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role.name,
      group:
        createdUser.role.group?.name ??
        null,
      manager:
        createdUser.manager?.name ??
        null,
      active: createdUser.active,
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
  // RETURN CREATED USER
  // -----------------------------------

  return createdUser;
}

  // -----------------------------------
  // GET ACCESSIBLE USERS
  // -----------------------------------

  private async getAccessibleUserIds(
    userId: number,
  ) {
    const currentUser =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
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
     * ADMIN
     *
     * Admin can access everyone.
     */
    if (currentUser.role.isAdmin) {
      const users =
        await this.prisma.user.findMany({
          select: {
            id: true,
          },
        });

      return users.map(
        (user) => user.id,
      );
    }

    // NON-ADMIN
//
// Start with the current user and recursively
// find everyone underneath by managerId.
const accessibleIds = [
  currentUser.id,
];

const queue = [
  currentUser.id,
];

while (queue.length > 0) {
  const managerId = queue.shift();

  const children =
    await this.prisma.user.findMany({
      where: {
        managerId,
      },

      select: {
        id: true,
      },
    });

  for (const child of children) {
    if (
      !accessibleIds.includes(child.id)
    ) {
      accessibleIds.push(child.id);
      queue.push(child.id);
    }
  }
}

/*
 * Also include unassigned non-admin users
 * whose role belongs to this user's reporting
 * hierarchy.
 *
 * This allows a user to remain visible after
 * their manager becomes inactive and managerId
 * is cleared.
 */
const allRoles =
  await this.prisma.role.findMany({
    select: {
      id: true,
      reportsToRoleId: true,
      isAdmin: true,
    },
  });

const accessibleRoleIds = [
  currentUser.roleId,
];

const roleQueue = [
  currentUser.roleId,
];

while (roleQueue.length > 0) {
  const parentRoleId =
    roleQueue.shift();

  const subordinateRoles =
    allRoles.filter(
      (role) =>
        role.reportsToRoleId ===
        parentRoleId,
    );

  for (const role of subordinateRoles) {
    if (
      !accessibleRoleIds.includes(
        role.id,
      )
    ) {
      accessibleRoleIds.push(
        role.id,
      );

      roleQueue.push(role.id);
    }
  }
}

const unassignedUsers =
  await this.prisma.user.findMany({
    where: {
      managerId: null,
      roleId: {
        in: accessibleRoleIds,
      },
      role: {
        isAdmin: false,
      },
    },

    select: {
      id: true,
    },
  });

for (const user of unassignedUsers) {
  if (
    !accessibleIds.includes(user.id)
  ) {
    accessibleIds.push(user.id);
  }
}

return accessibleIds;
  }

  // -----------------------------------
  // GET USERS
  // -----------------------------------

  async findAll(
  currentUserId: number,
  page = 1,
  limit = 10,
) {
  const accessibleUserIds =
    await this.getAccessibleUserIds(
      currentUserId,
    );

  const where = {
    id: {
      in: accessibleUserIds,
      not: currentUserId,
    },
  };

  const [users, total] =
    await Promise.all([
      this.prisma.user.findMany({
        where,

        include: {
          role: true,

          manager: {
            select: {
              id: true,
              name: true,
            },
          },
        },

        orderBy: {
          name: "asc",
        },

        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

  return {
    data: users,
    total,
    page,
    limit,
    totalPages: Math.ceil(
      total / limit,
    ),
  };
}

  // -----------------------------------
  // GET ORGANIZATION HIERARCHY
  // -----------------------------------

  async getHierarchy(
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

    const isAdmin =
      currentUser.role.isAdmin;

    /*
     * Admin can see the complete company,
     * including other admins.
     *
     * Non-admin users must never see admins.
     */
    const users =
      await this.prisma.user.findMany({
        where: isAdmin
          ? {}
          : {
              role: {
                isAdmin: false,
              },
            },

        select: {
        id: true,
        name: true,
        email: true,
        active: true,

        role: {
          select: {
            id: true,
            name: true,
            isAdmin: true,

            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        managerId: true,
      },
        orderBy: {
          name: "asc",
        },
      });

    /*
     * Create a lookup table.
     */
    const userMap = new Map<
      number,
      any
    >();

    for (const user of users) {
      userMap.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
        role: user.role,
        managerId: user.managerId,
        children: [],
        isCurrentUser:
          user.id === currentUserId,
      });
    }

    /*
     * Build the tree.
     */
    const roots: any[] = [];

    for (const user of userMap.values()) {
      /*
       * If the user's manager is visible,
       * put the user underneath them.
       */
      if (
        user.managerId !== null &&
        userMap.has(user.managerId)
      ) {
        userMap
          .get(user.managerId)
          .children.push(user);
      } else {
        /*
         * If the manager is hidden because
         * they are an Admin, this user becomes
         * a root of the visible hierarchy.
         */
        roots.push(user);
      }
    }

    return {
      currentUserId,
      isAdmin,
      hierarchy: roots,
    };
  }

  // -----------------------------------
  // GET SINGLE USER
  // -----------------------------------

  async findOne(
    targetUserId: number,
    requesterId: number,
  ) {
    // -----------------------------------
    // GET REQUESTER
    // -----------------------------------

    const requester =
      await this.prisma.user.findUnique({
        where: {
          id: requesterId,
        },

        include: {
          role: {
            include: {
              group: true,
              reportsToRole: true,
            },
          },
        },
      });

    if (!requester) {
      throw new NotFoundException(
        "Requester not found",
      );
    }

    // -----------------------------------
    // GET TARGET USER
    // -----------------------------------

    const user =
      await this.prisma.user.findUnique({
        where: {
          id: targetUserId,
        },

        include: {
          role: {
            include: {
              group: true,
              reportsToRole: true,
            },
          },

          manager: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    // -----------------------------------
    // CANNOT EDIT YOURSELF
    // -----------------------------------

    if (
      targetUserId === requesterId
    ) {
      throw new ForbiddenException(
        "You cannot manage your own account",
      );
    }

    // -----------------------------------
    // ADMIN CANNOT MANAGE ADMIN
    // -----------------------------------

    if (
      requester.role.isAdmin &&
      user.role.isAdmin
    ) {
      throw new ForbiddenException(
        "Administrators cannot manage other administrators",
      );
    }

    // -----------------------------------
    // CHECK HIERARCHY ACCESS
    // -----------------------------------

    const accessibleUserIds =
      await this.getAccessibleUserIds(
        requesterId,
      );

    if (
      !accessibleUserIds.includes(
        targetUserId,
      )
    ) {
      throw new ForbiddenException(
        "You are not allowed to manage this user",
      );
    }

    return user;
  }

  // -----------------------------------
  // GET POSSIBLE MANAGERS
  // -----------------------------------

  async getPossibleManagers(
    targetUserId: number,
    requesterId: number,
  ) {
    const targetUser =
      await this.prisma.user.findUnique({
        where: {
          id: targetUserId,
        },

        include: {
          role: {
            include: {
              reportsToRole: true,
            },
          },
        },
      });

    if (!targetUser) {
      throw new NotFoundException(
        "User not found",
      );
    }

    const requester =
      await this.prisma.user.findUnique({
        where: {
          id: requesterId,
        },

        include: {
          role: true,
        },
      });

    if (!requester) {
      throw new NotFoundException(
        "Requester not found",
      );
    }

    /*
     * Admin users do not have managers.
     */
    if (targetUser.role.isAdmin) {
      return [];
    }

    /*
     * The target role must define which
     * role reports to it.
     */
    const requiredManagerRoleId =
      targetUser.role.reportsToRoleId;

    if (
      requiredManagerRoleId === null
    ) {
      return [];
    }

    // -----------------------------------
    // ADMIN REQUESTER
    // -----------------------------------

    if (requester.role.isAdmin) {
      return this.prisma.user.findMany({
        where: {
          id: {
            not: targetUserId,
          },

          active: true,

          role: {
            id: requiredManagerRoleId,
            active: true,
          },
        },

        include: {
          role: true,
        },

        orderBy: {
          name: "asc",
        },
      });
    }

    // -----------------------------------
    // NON-ADMIN REQUESTER
    // -----------------------------------

    const accessibleIds =
      await this.getAccessibleUserIds(
        requesterId,
      );

    if (
      !accessibleIds.includes(
        targetUserId,
      )
    ) {
      return [];
    }

    return this.prisma.user.findMany({
      where: {
        id: {
          in: accessibleIds,
          not: targetUserId,
        },

        active: true,

        role: {
          id: requiredManagerRoleId,
          active: true,
        },
      },

      include: {
        role: true,
      },

      orderBy: {
        name: "asc",
      },
    });
  }

  // -----------------------------------
  // POSSIBLE MANAGERS FOR NEW USER
  // -----------------------------------

  async getPossibleManagersForRole(
    roleId: number,
    requesterId: number,
  ) {
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
      return [];
    }

    if (
      role.reportsToRoleId === null
    ) {
      return [];
    }

    const requester =
      await this.prisma.user.findUnique({
        where: {
          id: requesterId,
        },

        include: {
          role: true,
        },
      });

    if (!requester) {
      throw new NotFoundException(
        "Requester not found",
      );
    }

    const requiredManagerRoleId =
      role.reportsToRoleId;

    // -----------------------------------
    // ADMIN
    // -----------------------------------

    if (requester.role.isAdmin) {
      return this.prisma.user.findMany({
        where: {
          active: true,

          role: {
            id: requiredManagerRoleId,
            active: true,
          },
        },

        include: {
          role: true,
        },

        orderBy: {
          name: "asc",
        },
      });
    }

    // -----------------------------------
    // NON-ADMIN
    // -----------------------------------

    const accessibleUserIds =
      await this.getAccessibleUserIds(
        requesterId,
      );

    return this.prisma.user.findMany({
      where: {
        id: {
          in: accessibleUserIds,
        },

        active: true,

        role: {
          id: requiredManagerRoleId,
          active: true,
        },
      },

      include: {
        role: true,
      },

      orderBy: {
        name: "asc",
      },
    });
  }

  // -----------------------------------
  // UPDATE USER
  // -----------------------------------

  async update(
  id: number,
  updateUserDto: UpdateUserDto,
  currentUserId: number,
  req: any,
) {
  // -----------------------------------
  // GET CURRENT USER
  // -----------------------------------

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

  // -----------------------------------
  // CANNOT EDIT YOURSELF
  // -----------------------------------

  if (id === currentUserId) {
    throw new ForbiddenException(
      "You cannot manage your own account",
    );
  }

  // -----------------------------------
  // GET TARGET USER
  // -----------------------------------

  const user =
  await this.prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      role: {
        include: {
          reportsToRole: true,
          group: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException(
      "User not found",
    );
  }

  // -----------------------------------
  // ADMIN CANNOT EDIT ANOTHER ADMIN
  // -----------------------------------

  if (
    currentUser.role.isAdmin &&
    user.role.isAdmin
  ) {
    throw new ForbiddenException(
      "Administrators cannot manage other administrators",
    );
  }

  // -----------------------------------
  // CHECK HIERARCHY ACCESS
  // -----------------------------------

  const accessibleUserIds =
    await this.getAccessibleUserIds(
      currentUserId,
    );

  if (
    !accessibleUserIds.includes(id)
  ) {
    throw new ForbiddenException(
      "You are not allowed to manage this user",
    );
  }

  // -----------------------------------
  // DETERMINE TARGET ROLE
  // -----------------------------------

  let targetRoleId =
    user.roleId;

  if (
    updateUserDto.roleId !== undefined
  ) {
    targetRoleId =
      updateUserDto.roleId;
  }

  const targetRole =
    await this.prisma.role.findUnique({
      where: {
        id: targetRoleId,
      },
      include: {
        reportsToRole: true,
      },
    });

  if (!targetRole) {
    throw new NotFoundException(
      "Selected role not found",
    );
  }

  // -----------------------------------
  // TARGET ROLE MUST BE ACTIVE
  // -----------------------------------

  if (!targetRole.active) {
    throw new ForbiddenException(
      "Cannot assign an inactive role",
    );
  }

  // -----------------------------------
  // NON-ADMIN CANNOT ASSIGN ADMIN ROLE
  // -----------------------------------

  if (
    targetRole.isAdmin &&
    !currentUser.role.isAdmin
  ) {
    throw new ForbiddenException(
      "Only administrators can assign administrator roles",
    );
  }

  // -----------------------------------
  // ADMIN ROLE
  // -----------------------------------

  if (targetRole.isAdmin) {
    if (
      updateUserDto.managerId !==
        undefined &&
      updateUserDto.managerId !== null
    ) {
      throw new ForbiddenException(
        "Administrator users cannot have a manager",
      );
    }

    updateUserDto.managerId = null;
  }

  // -----------------------------------
  // MANAGER VALIDATION
  // -----------------------------------

  if (
    !targetRole.isAdmin &&
    updateUserDto.managerId !==
      undefined
  ) {
    // -----------------------------------
    // ROLE MUST HAVE REPORTING ROLE
    // -----------------------------------

    if (
      targetRole.reportsToRoleId ===
      null
    ) {
      throw new ForbiddenException(
        "Selected role must have a reporting role",
      );
    }

    // -----------------------------------
    // NO MANAGER
    // -----------------------------------

    if (
      updateUserDto.managerId === null
    ) {
      /*
       * Temporarily unassigned is allowed.
       */
    } else {
      // -----------------------------------
      // GET MANAGER
      // -----------------------------------

      const manager =
        await this.prisma.user.findUnique({
          where: {
            id: updateUserDto.managerId,
          },
          include: {
            role: true,
          },
        });

      if (!manager) {
        throw new NotFoundException(
          "Manager not found",
        );
      }

      // -----------------------------------
      // CANNOT MANAGE SELF
      // -----------------------------------

      if (manager.id === id) {
        throw new ForbiddenException(
          "A user cannot be their own manager",
        );
      }

      // -----------------------------------
      // MANAGER ACCESS
      // -----------------------------------

      if (
        !currentUser.role.isAdmin &&
        !accessibleUserIds.includes(
          manager.id,
        )
      ) {
        throw new ForbiddenException(
          "You are not allowed to assign this manager",
        );
      }

      // -----------------------------------
      // MANAGER ROLE
      // -----------------------------------

      if (
        manager.role.id !==
        targetRole.reportsToRoleId
      ) {
        throw new ForbiddenException(
          "Selected manager does not have the required reporting role",
        );
      }

      // -----------------------------------
      // MANAGER ACTIVE
      // -----------------------------------

      if (!manager.active) {
        updateUserDto.managerId = null;
      }

      // -----------------------------------
      // MANAGER ROLE ACTIVE
      // -----------------------------------

      if (
        manager.role.active === false
      ) {
        updateUserDto.managerId = null;
      }
    }
  }

  // -----------------------------------
  // ROLE CHANGE WITHOUT MANAGER CHANGE
  // -----------------------------------

  if (
    updateUserDto.roleId !==
      undefined &&
    !targetRole.isAdmin &&
    updateUserDto.managerId ===
      undefined
  ) {
    // -----------------------------------
    // ROLE MUST HAVE REPORTING ROLE
    // -----------------------------------

    if (
      targetRole.reportsToRoleId ===
      null
    ) {
      throw new ForbiddenException(
        "Selected role must have a reporting role",
      );
    }

    // -----------------------------------
    // NO EXISTING MANAGER
    // -----------------------------------

    if (user.managerId === null) {
      /*
       * User remains unassigned.
       */
    } else {
      // -----------------------------------
      // VALIDATE EXISTING MANAGER
      // -----------------------------------

      const existingManager =
        await this.prisma.user.findUnique({
          where: {
            id: user.managerId,
          },
          include: {
            role: true,
          },
        });

      if (!existingManager) {
        throw new NotFoundException(
          "Existing manager not found",
        );
      }

      // -----------------------------------
      // EXISTING MANAGER ACCESS
      // -----------------------------------

      if (
        !currentUser.role.isAdmin &&
        !accessibleUserIds.includes(
          existingManager.id,
        )
      ) {
        throw new ForbiddenException(
          "You are not allowed to keep this manager",
        );
      }

      // -----------------------------------
      // MANAGER ACTIVE
      // -----------------------------------

      if (!existingManager.active) {
        updateUserDto.managerId = null;
      }

      // -----------------------------------
      // MANAGER ROLE ACTIVE
      // -----------------------------------

      if (
        existingManager.role.active ===
        false
      ) {
        updateUserDto.managerId = null;
      }

      // -----------------------------------
      // MANAGER ROLE
      // -----------------------------------

      if (
        updateUserDto.managerId !== null &&
        existingManager.role.id !==
          targetRole.reportsToRoleId
      ) {
        throw new ForbiddenException(
          "The user's current manager does not have the required reporting role for the selected role",
        );
      }
    }
  }

  // -----------------------------------
  // PREPARE UPDATE
  // -----------------------------------

  const data: any = {
    ...updateUserDto,
  };

  // -----------------------------------
  // HASH PASSWORD
  // -----------------------------------

  if (updateUserDto.password) {
    data.password =
      await bcrypt.hash(
        updateUserDto.password,
        10,
      );
  } else {
    delete data.password;
  }

  // -----------------------------------
  // SAVE
  // -----------------------------------

  const updatedUser =
  await this.prisma.user.update({
    where: {
      id,
    },

    data,

    include: {
    role: {
      include: {
        reportsToRole: true,
        group: true,
      },
    },

    manager: {
      select: {
        id: true,
        name: true,
      },
    },
  },
  });

await this.auditLogsService.log({
  actorId: currentUserId,
  action: AuditAction.USER_UPDATED,
  entity: "User",
  entityId: updatedUser.id,
  description:
    `User ${updatedUser.name} was updated`,

  oldValues: {
    name: user.name,
    email: user.email,
    role: user.role.name,
    group:
      user.role.group?.name ??
      null,
    active: user.active,
    manager:
      user.manager?.name ??
      null,
  },

  newValues: {
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role.name,
    group:
      updatedUser.role.group?.name ??
      null,
    active: updatedUser.active,
    manager:
      updatedUser.manager?.name ??
      null,
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
// ROLE CHANGE AUDIT
// -----------------------------------

if (
  user.roleId !==
  updatedUser.roleId
) {
  await this.auditLogsService.log({
    actorId: currentUserId,
    action: AuditAction.USER_ROLE_CHANGED,
    entity: "User",
    entityId: updatedUser.id,
    description:
      `User ${updatedUser.name} role was changed`,

    oldValues: {
      roleId: user.roleId,
      role: user.role.name,
    },

    newValues: {
      roleId: updatedUser.roleId,
      role: updatedUser.role.name,
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
// MANAGER CHANGE AUDIT
// -----------------------------------

if (
  user.managerId !==
  updatedUser.managerId
) {
  await this.auditLogsService.log({
    actorId: currentUserId,
    action: AuditAction.USER_MANAGER_CHANGED,
    entity: "User",
    entityId: updatedUser.id,
    description:
      `User ${updatedUser.name} manager was changed`,

    oldValues: {
      managerId:
        user.managerId ??
        null,
      manager:
        user.manager?.name ??
        null,
    },

    newValues: {
      managerId:
        updatedUser.managerId ??
        null,
      manager:
        updatedUser.manager?.name ??
        null,
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

return updatedUser;
}

  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  async remove(
    id: number,
    currentUserId: number,
    req: any,
  ) {
    // -----------------------------------
    // GET CURRENT USER
    // -----------------------------------

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

    // -----------------------------------
    // CANNOT DELETE YOURSELF
    // -----------------------------------

    if (id === currentUserId) {
      throw new ForbiddenException(
        "You cannot delete your own account",
      );
    }

    // -----------------------------------
    // GET TARGET USER
    // -----------------------------------

    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        include: {
        role: {
          include: {
            group: true,
          },
        },

        manager: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    // -----------------------------------
    // ADMIN CANNOT DELETE ANOTHER ADMIN
    // -----------------------------------

    if (
      currentUser.role.isAdmin &&
      user.role.isAdmin
    ) {
      throw new ForbiddenException(
        "Administrators cannot manage other administrators",
      );
    }

    // -----------------------------------
    // CHECK HIERARCHY ACCESS
    // -----------------------------------

    const accessibleUserIds =
      await this.getAccessibleUserIds(
        currentUserId,
      );

    if (
      !accessibleUserIds.includes(id)
    ) {
      throw new ForbiddenException(
        "You are not allowed to delete this user",
      );
    }

    // -----------------------------------
    // DELETE
    // -----------------------------------

    await this.auditLogsService.log({
  actorId: currentUserId,
  action: AuditAction.USER_DELETED,
  entity: "User",
  entityId: user.id,
  description:
    `User ${user.name} was deleted`,

  oldValues: {
    name: user.name,
    email: user.email,
    role: user.role.name,
    group:
      user.role.group?.name ??
      null,
    manager:
      user.manager?.name ??
      null,
    active: user.active,
  },

  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    null,

  userAgent:
    req.headers["user-agent"] ||
    null,
});

await this.prisma.user.delete({
  where: {
    id,
  },
});

return {
  message: "User deleted successfully",
};
  }

  // -----------------------------------
  // UPDATE USER STATUS
  // -----------------------------------

  async updateStatus(
    id: number,
    active: boolean,
    currentUserId: number,
    req: any,
  ) {
    // -----------------------------------
    // GET CURRENT USER
    // -----------------------------------

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

    // -----------------------------------
    // CANNOT CHANGE OWN STATUS
    // -----------------------------------

    if (id === currentUserId) {
      throw new ForbiddenException(
        "You cannot change your own account status",
      );
    }

    // -----------------------------------
    // GET TARGET USER
    // -----------------------------------

    const user =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        include: {
          role: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        "User not found",
      );
    }

    // -----------------------------------
    // ADMIN CANNOT MANAGE ADMIN
    // -----------------------------------

    if (
      currentUser.role.isAdmin &&
      user.role.isAdmin
    ) {
      throw new ForbiddenException(
        "Administrators cannot manage other administrators",
      );
    }

    // -----------------------------------
    // CHECK HIERARCHY ACCESS
    // -----------------------------------

    const accessibleUserIds =
      await this.getAccessibleUserIds(
        currentUserId,
      );

    if (
      !accessibleUserIds.includes(id)
    ) {
      throw new ForbiddenException(
        "You are not allowed to change this user's status",
      );
    }

    // -----------------------------------
    // UPDATE STATUS
    // -----------------------------------

    const updatedUser =
  await this.prisma.user.update({
    where: {
      id,
    },

    data: {
      active,
    },

    include: {
      role: true,

      manager: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

await this.auditLogsService.log({
  actorId: currentUserId,
  action: AuditAction.USER_STATUS_CHANGED,
  entity: "User",
  entityId: updatedUser.id,
  description:
    `User ${updatedUser.name} status was changed`,

  oldValues: {
    active: user.active,
  },

  newValues: {
    active: updatedUser.active,
  },

  ipAddress:
    req.ip ||
    req.headers["x-forwarded-for"] ||
    null,

  userAgent:
    req.headers["user-agent"] ||
    null,
});

return updatedUser;
  }
}
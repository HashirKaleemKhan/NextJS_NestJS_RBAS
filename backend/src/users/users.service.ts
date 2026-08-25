import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // -----------------------------------
  // CREATE USER
  // -----------------------------------

  async create(
    createUserDto: CreateUserDto,
    currentUserId: number,
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
          role: true,
        },
      });

    if (!currentUser) {
      throw new NotFoundException(
        "Current user not found",
      );
    }

    // -----------------------------------
    // ADMIN ONLY
    // -----------------------------------

    if (!currentUser.role.isAdmin) {
      throw new ForbiddenException(
        "Only administrators can create users",
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
        },
      });

    if (!role) {
      throw new NotFoundException(
        "Selected role not found",
      );
    }

    // -----------------------------------
// VALIDATE MANAGER
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
  /*
   * Administrator users never have
   * a manager.
   */
  managerId = null;
}

// -----------------------------------
// TOP-LEVEL NON-ADMIN ROLE
// -----------------------------------

else if (
  role.reportsToRoleId === null
) {
  /*
   * Example: CEO
   *
   * This role does not report to another
   * role, therefore users with this role
   * do not need a manager.
   */
  managerId = null;
}

// -----------------------------------
// ROLE HAS A REPORTING ROLE
// -----------------------------------

else {
  /*
   * A manager may not exist yet.
   * In that case the user can remain
   * unassigned until a valid manager
   * exists.
   */
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
    // CANNOT MANAGE YOURSELF
    // -----------------------------------

    if (
      manager.id === currentUserId
    ) {
      throw new ForbiddenException(
        "Invalid manager assignment",
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
    // MANAGER ROLE MUST BE ACTIVE
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

    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        roleId: createUserDto.roleId,
        managerId,
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

    /*
     * MANAGER / SUPERVISOR / DEVELOPER
     *
     * Start with the current user and
     * recursively find everyone underneath.
     *
     * User hierarchy is determined by
     * managerId, not by role level.
     */
    const accessibleIds = [
      currentUser.id,
    ];

    const queue = [
      currentUser.id,
    ];

    while (queue.length > 0) {
      const managerId =
        queue.shift();

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
        accessibleIds.push(
          child.id,
        );

        queue.push(child.id);
      }
    }

    return accessibleIds;
  }

  // -----------------------------------
  // GET USERS
  // -----------------------------------

  async findAll(
    currentUserId: number,
  ) {
    const accessibleUserIds =
      await this.getAccessibleUserIds(
        currentUserId,
      );

    return this.prisma.user.findMany({
      where: {
        id: {
          in: accessibleUserIds,
          not: currentUserId,
        },
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

      orderBy: {
        name: "asc",
      },
    });
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

          role: {
            select: {
              id: true,
              name: true,
              isAdmin: true,
            },
          },

          managerId: true,
        },

        orderBy: {
          name: "asc",
        },
      });

    /*
     * Create a lookup table so we can
     * build the hierarchy efficiently.
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
        role: true,
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

  if (targetUserId === requesterId) {
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

    /*
     * Admin can assign a manager anywhere
     * in the organization, but the manager
     * must have the role required by the
     * target user's role.
     */
    if (requester.role.isAdmin) {
      return this.prisma.user.findMany({
        where: {
          id: {
            not: targetUserId,
          },

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

    /*
     * The requester must be allowed to
     * manage the target user.
     */
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

    /*
     * Find managers inside the requester's
     * accessible hierarchy.
     *
     * The required manager role comes from
     * reportsToRoleId.
     *
     * User hierarchy itself is still based
     * on managerId.
     */
    return this.prisma.user.findMany({
      where: {
        id: {
          in: accessibleIds,
          not: targetUserId,
        },

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
    // -----------------------------------
    // GET SELECTED ROLE
    // -----------------------------------

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

    // -----------------------------------
    // ADMIN HAS NO MANAGER
    // -----------------------------------

    if (role.isAdmin) {
      return [];
    }

    // -----------------------------------
    // ROLE MUST HAVE REPORTING ROLE
    // -----------------------------------

    if (
      role.reportsToRoleId === null
    ) {
      return [];
    }

    // -----------------------------------
    // GET REQUESTER
    // -----------------------------------

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

    // -----------------------------------
    // ADMIN
    // -----------------------------------

    /*
     * Admin can create users under the
     * required manager role anywhere.
     */
    if (requester.role.isAdmin) {
      return this.prisma.user.findMany({
        where: {
          id: {
            not: requesterId,
          },

          role: {
            id: role.reportsToRoleId,
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

    /*
     * users.create is currently Admin-only,
     * so non-admin users should not reach
     * this point.
     */
    return [];
  }

  // -----------------------------------
  // UPDATE USER
  // -----------------------------------

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    currentUserId: number,
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
    // ADMIN ROLE
    // -----------------------------------

    /*
     * Administrator users never have
     * a manager.
     */
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

      // Force managerId to null when
      // changing a user into an admin.
      updateUserDto.managerId = null;
    }

    // -----------------------------------
// MANAGER VALIDATION
// -----------------------------------

if (
  !targetRole.isAdmin &&
  updateUserDto.managerId !== undefined
) {
  // -----------------------------------
  // ROLE MUST HAVE REPORTING ROLE
  // -----------------------------------

  if (
    targetRole.reportsToRoleId === null
  ) {
    throw new ForbiddenException(
      "Selected role must have a reporting role",
    );
  }

  // -----------------------------------
  // NO MANAGER
  // -----------------------------------

  /*
   * A role can require a reporting role
   * without a matching user currently
   * existing in the database.
   *
   * Therefore managerId = null is allowed.
   */
  if (updateUserDto.managerId === null) {
    // Nothing else to validate.
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

    if (!manager.role.active) {
      throw new ForbiddenException(
        "Cannot assign a user to someone with an inactive role",
      );
    }
  }
}

    // -----------------------------------
// ROLE CHANGE WITHOUT MANAGER CHANGE
// -----------------------------------

/*
 * If the role changes but managerId was
 * not supplied, keep the existing manager
 * only if that manager is still valid for
 * the new role.
 *
 * If there is no existing manager, that is
 * allowed. The user simply remains without
 * a manager until a valid manager exists.
 */

if (
  updateUserDto.roleId !== undefined &&
  !targetRole.isAdmin &&
  updateUserDto.managerId === undefined
) {
  // -----------------------------------
  // ROLE MUST HAVE REPORTING ROLE
  // -----------------------------------

  if (
    targetRole.reportsToRoleId === null
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
     * No manager currently exists.
     *
     * This is allowed. The user's manager
     * remains null until a valid manager
     * is assigned later.
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
    // MANAGER ROLE
    // -----------------------------------

    if (
      existingManager.role.id !==
      targetRole.reportsToRoleId
    ) {
      throw new ForbiddenException(
        "The user's current manager does not have the required reporting role for the selected role",
      );
    }

    // -----------------------------------
    // MANAGER ACTIVE
    // -----------------------------------

    if (
      !existingManager.role.active
    ) {
      throw new ForbiddenException(
        "Cannot assign a user to someone with an inactive role",
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

    /*
     * Hash password only when a new
     * password was provided.
     */
    if (updateUserDto.password) {
      data.password =
        await bcrypt.hash(
          updateUserDto.password,
          10,
        );
    } else {
      delete data.password;
    }

    return this.prisma.user.update({
      where: {
        id,
      },

      data,

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
  }

  // -----------------------------------
  // DELETE USER
  // -----------------------------------

  async remove(
    id: number,
    currentUserId: number,
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
          role: true,
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

    await this.prisma.user.delete({
      where: {
        id,
      },
    });

    return {
      message: "User deleted successfully",
    };
  }
}
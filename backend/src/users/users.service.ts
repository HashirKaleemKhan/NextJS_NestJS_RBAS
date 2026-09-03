import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
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

else if (
  role.reportsToRoleId === null
) {
  throw new BadRequestException(
    "A non-administrator role must have a reporting role",
  );
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
// GET ROLES AVAILABLE FOR USER CREATION
// FOR GRAPHQL USER CREATION FORM
// -----------------------------------

async findRolesForUserCreation(
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

  // -----------------------------------
  // ADMIN ONLY
  // -----------------------------------

  if (!currentUser.role.isAdmin) {
    throw new ForbiddenException(
      "Only administrators can create users",
    );
  }

  // -----------------------------------
  // ACTIVE NON-ADMIN ROLES
  // -----------------------------------

  return this.prisma.role.findMany({
    where: {
      active: true,
      isAdmin: false,
    },

    include: {
      reportsToRole: true,
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
      throw new UnauthorizedException(
        "User not found",
      );
    }

    // -----------------------------------
    // CANNOT EDIT YOURSELF
    // -----------------------------------

    if (id === currentUserId) {
      throw new ForbiddenException(
        "You cannot edit your own account",
      );
    }

    // -----------------------------------
    // GET EXISTING USER
    // -----------------------------------

    const existingUser =
      await this.prisma.user.findUnique({
        where: {
          id,
        },

        include: {
          role: true,

          manager: {
            include: {
              role: true,
            },
          },
        },
      });

    if (!existingUser) {
      throw new NotFoundException(
        "User not found",
      );
    }

    // -----------------------------------
    // ADMIN CANNOT EDIT ADMIN
    // -----------------------------------

    if (
      currentUser.role.isAdmin &&
      existingUser.role.isAdmin
    ) {
      throw new ForbiddenException(
        "Administrators cannot edit another administrator",
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
        "You do not have permission to edit this user",
      );
    }

    // -----------------------------------
    // DETERMINE TARGET ROLE
    // -----------------------------------

    const targetRoleId =
      updateUserDto.roleId ??
      existingUser.roleId;

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
    // ROLE CHANGE
    // -----------------------------------

    /*
     * Only administrators can change
     * another user's role.
     */
    if (
      updateUserDto.roleId !== undefined &&
      updateUserDto.roleId !==
        existingUser.roleId &&
      !currentUser.role.isAdmin
    ) {
      throw new ForbiddenException(
        "Only administrators can change user roles",
      );
    }

    // -----------------------------------
    // MANAGER
    // -----------------------------------

    let managerId:
      | number
      | null =
      existingUser.managerId;

    // -----------------------------------
    // ADMINISTRATOR
    // -----------------------------------

    if (targetRole.isAdmin) {
      /*
       * Administrators are the only
       * top-level users.
       *
       * They never have a manager.
       */
      managerId = null;
    }

    // -----------------------------------
    // NON-ADMIN ROLE
    // -----------------------------------

    else {
      /*
       * A non-admin user must have a role
       * that defines who they report to.
       *
       * We never treat a non-admin role
       * as a top-level user.
       */
      if (
        targetRole.reportsToRoleId === null
      ) {
        throw new BadRequestException(
          "A non-administrator role must have a reporting role",
        );
      }

      // -----------------------------------
      // DETERMINE MANAGER
      // -----------------------------------

      if (
        updateUserDto.managerId !== undefined
      ) {
        /*
         * The form explicitly selected
         * no manager.
         */
        managerId =
          updateUserDto.managerId;
      }

      // -----------------------------------
      // FIND ELIGIBLE MANAGERS
      // -----------------------------------

      const eligibleManagers =
        await this.prisma.user.findMany({
          where: {
            id: {
              not: id,
            },

            role: {
              id: targetRole.reportsToRoleId,
              active: true,
            },
          },

          select: {
            id: true,
          },
        });

      // -----------------------------------
      // MANAGER EXISTS
      // -----------------------------------

      if (
        eligibleManagers.length > 0 &&
        managerId === null
      ) {
        /*
         * A valid manager exists, therefore
         * this non-admin user must report
         * to one of them.
         */
        throw new BadRequestException(
          "A manager is required for the selected role",
        );
      }

      // -----------------------------------
      // NO MANAGER AVAILABLE
      // -----------------------------------

      /*
       * If there are no eligible managers,
       * managerId may remain null.
       *
       * This matches the Create User page.
       */

      // -----------------------------------
      // VALIDATE SELECTED MANAGER
      // -----------------------------------

      if (managerId !== null) {
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
        // CANNOT ASSIGN YOURSELF
        // -----------------------------------

        if (
          manager.id === currentUserId
        ) {
          throw new BadRequestException(
            "You cannot assign yourself as manager",
          );
        }

        // -----------------------------------
        // USER CANNOT MANAGE THEMSELVES
        // -----------------------------------

        if (
          manager.id === id
        ) {
          throw new BadRequestException(
            "A user cannot be their own manager",
          );
        }

        // -----------------------------------
        // MANAGER MUST BE ACTIVE
        // -----------------------------------

        if (!manager.role.active) {
          throw new BadRequestException(
            "Selected manager is inactive",
          );
        }

        // -----------------------------------
        // MANAGER ROLE
        // -----------------------------------

        if (
          manager.role.id !==
          targetRole.reportsToRoleId
        ) {
          throw new BadRequestException(
            "Selected manager does not have the required reporting role",
          );
        }

        // -----------------------------------
        // NON-ADMIN ACCESS
        // -----------------------------------

        if (
          !currentUser.role.isAdmin
        ) {
          const managerAccessible =
            accessibleUserIds.includes(
              manager.id,
            );

          if (!managerAccessible) {
            throw new ForbiddenException(
              "You do not have permission to assign this manager",
            );
          }
        }

        managerId = manager.id;
      }
    }

    // -----------------------------------
    // PASSWORD
    // -----------------------------------

    const data: any = {
      name: updateUserDto.name,
      email: updateUserDto.email,
      roleId: targetRoleId,
      managerId,
    };

    if (
      updateUserDto.password &&
      updateUserDto.password.trim()
    ) {
      data.password =
        await bcrypt.hash(
          updateUserDto.password,
          10,
        );
    }

    // -----------------------------------
    // UPDATE USER
    // -----------------------------------

    return this.prisma.user.update({
      where: {
        id,
      },

      data,

      include: {
        role: {
          include: {
            reportsToRole: true,
          },
        },

        manager: {
          include: {
            role: true,
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
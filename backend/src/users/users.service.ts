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

  if (currentUser.role.level !== 4) {
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
    });

  if (!role) {
    throw new NotFoundException(
      "Selected role not found",
    );
  }
  

  // -----------------------------------
  // ADMIN CANNOT CREATE ANOTHER ADMIN
  // -----------------------------------
  //
  // We can change this later if you want
  // multiple administrators.
  //

  if (role.level === 4) {
    throw new ForbiddenException(
      "Administrators cannot create another administrator",
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

    if (role.level < 4 && !managerId) {
  throw new ForbiddenException(
    "A non-admin user must have a manager",
  );
}

  if (
    managerId !== undefined &&
    managerId !== null
  ) {
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

    // Manager must be exactly
    // one level above the new user.

    if (
      manager.role.level !==
      role.level + 1
    ) {
      throw new ForbiddenException(
        "The selected manager must be exactly one level above the new user's role",
      );
    }

    // Manager cannot be the user being
    // created. This is mostly defensive
    // because the new user doesn't exist yet.

    if (
      managerId === currentUserId &&
      manager.role.level !== 4
    ) {
      throw new ForbiddenException(
        "Invalid manager assignment",
      );
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
  // CREATE 
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
    if (currentUser.role.level === 4) {
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

  async findAll(currentUserId: number) {
  const accessibleUserIds =
    await this.getAccessibleUserIds(currentUserId);

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

    orderBy: [
      {
        role: {
          level: "desc",
        },
      },
      {
        name: "asc",
      },
    ],
  });
}

// -----------------------------------
// GET ORGANIZATION HIERARCHY
// -----------------------------------

async getHierarchy(currentUserId: number) {
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
    currentUser.role.level === 4;

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
              level: {
                lt: 4,
              },
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
            level: true,
          },
        },
        managerId: true,
      },

      orderBy: [
        {
          role: {
            level: "desc",
          },
        },
        {
          name: "asc",
        },
      ],
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
        role: true,
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
   * Admin
   *
   * Admin is level 4.
   * Admin has no manager above them.
   */
  if (targetUser.role.level >= 4) {
    return [];
  }

  /*
   * A user can only report to exactly
   * one hierarchy level above them.
   *
   * Developer 1 -> Supervisor 2
   * Supervisor 2 -> Manager 3
   * Manager 3 -> Admin 4
   */
  const requiredManagerLevel =
    targetUser.role.level + 1;

  /*
   * ADMIN
   *
   * Admin can assign anyone to the
   * appropriate level.
   */
  if (requester.role.level === 4) {
    return this.prisma.user.findMany({
      where: {
        role: {
          level: requiredManagerLevel,
        },

        id: {
          not: targetUserId,
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

  /*
   * The requester must be allowed to
   * manage the target user.
   */
  const accessibleIds =
    await this.getAccessibleUserIds(
      requesterId,
    );

  if (!accessibleIds.includes(targetUserId)) {
    return [];
  }

  /*
   * Find managers one level above the target,
   * but only inside the requester's hierarchy.
   */
  return this.prisma.user.findMany({
    where: {
      id: {
        in: accessibleIds,
        not: targetUserId,
      },

      role: {
        level: requiredManagerLevel,
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

  const role = await this.prisma.role.findUnique({
    where: {
      id: roleId,
    },
  });

  if (!role) {
    throw new NotFoundException("Role not found");
  }

  // -----------------------------------
  // ADMIN HAS NO MANAGER
  // -----------------------------------

  if (role.level === 4) {
    return [];
  }

  // -----------------------------------
  // GET REQUESTER
  // -----------------------------------

  const requester = await this.prisma.user.findUnique({
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
  //
  // Admin can create users under the
  // appropriate level anywhere.
  // -----------------------------------

  if (requester.role.level === 4) {
    return this.prisma.user.findMany({
      where: {
        role: {
          level: role.level + 1,
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
  //
  // Normally this should not be reached
  // because users.create is Admin-only.
  // -----------------------------------

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
        role: true,
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
    currentUser.role.level === 4 &&
    user.role.level === 4
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

  if (!accessibleUserIds.includes(id)) {
    throw new ForbiddenException(
      "You are not allowed to manage this user",
    );
  }

  // -----------------------------------
  // MANAGER VALIDATION
  // -----------------------------------

if (updateUserDto.managerId !== undefined) {

  // "No Manager"
  if (updateUserDto.managerId === null) {
    throw new ForbiddenException(
      "A user must have a manager",
    );
  }

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

  // User cannot manage themselves
  if (manager.id === id) {
    throw new ForbiddenException(
      "A user cannot be their own manager",
    );
  }

  // Manager must be exactly one level above
  if (
    manager.role.level !==
    user.role.level + 1
  ) {
    throw new ForbiddenException(
      "A user can only be assigned to someone one level above them",
    );
  }

  // Manager must be inside requester's hierarchy
  if (
    !accessibleUserIds.includes(
      manager.id,
    )
  ) {
    throw new ForbiddenException(
      "You are not allowed to assign this manager",
    );
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
    currentUser.role.level === 4 &&
    user.role.level === 4
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

  if (!accessibleUserIds.includes(id)) {
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
  
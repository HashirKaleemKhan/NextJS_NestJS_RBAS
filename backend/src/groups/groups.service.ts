import {
  Injectable,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGroupDto } from "./dto/create-group.dto";

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // -----------------------------------
  // GET GROUPS
  // -----------------------------------

  findAll() {
    return this.prisma.group.findMany({
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
    });
  }

  // -----------------------------------
  // CREATE GROUP
  // -----------------------------------

  async create(dto: CreateGroupDto) {
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

        // Groups can only contain
        // parent permissions.
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

    return this.prisma.group.findUnique({
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
) {
  const group =
    await this.prisma.group.findUnique({
      where: {
        id,
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

    await this.prisma.groupPermission.deleteMany(
      {
        where: {
          groupId: id,
        },
      },
    );

    if (dto.permissionIds.length > 0) {
      await this.prisma.groupPermission.createMany(
        {
          data: dto.permissionIds.map(
            (permissionId) => ({
              groupId: id,
              permissionId,
            }),
          ),
        },
      );
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

  return this.findOne(id);
}

// -----------------------------------
// DELETE GROUP
// -----------------------------------

async remove(id: number) {
  const group =
    await this.prisma.group.findUnique({
      where: {
        id,
      },

      include: {
        roles: true,
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

async toggleStatus(id: number) {
  const group =
    await this.prisma.group.findUnique({
      where: { id },
    });

  if (!group) {
    throw new NotFoundException(
      "Group not found",
    );
  }

  return this.prisma.group.update({
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
}
}
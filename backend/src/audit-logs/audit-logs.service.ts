import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

export type AuditLogInput = {
  actorId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  description: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // CREATE AUDIT LOG
  // =========================================================

  async log(input: AuditLogInput) {
    let actorName: string | null = null;
    let actorEmail: string | null = null;

    if (input.actorId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: input.actorId },
        select: {
          name: true,
          email: true,
        },
      });

      if (actor) {
        actorName = actor.name;
        actorEmail = actor.email;
      }
    }

    const data: Prisma.AuditLogCreateInput = {
      actor: input.actorId
        ? {
            connect: {
              id: input.actorId,
            },
          }
        : undefined,

      actorName,
      actorEmail,

      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      description: input.description,

      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    };

    const oldValues = this.sanitizeValues(input.oldValues);
    const newValues = this.sanitizeValues(input.newValues);

    if (oldValues !== undefined) {
      data.oldValues = oldValues;
    }

    if (newValues !== undefined) {
      data.newValues = newValues;
    }

    return this.prisma.auditLog.create({
      data,
    });
  }

  // =========================================================
  // GET AUDIT LOGS
  // =========================================================

  async findAll(options?: {
    page?: number;
    limit?: number;
    search?: string;
    action?: string;
    entity?: string;
  }) {
    const page = Math.max(options?.page ?? 1, 1);
    const limit = Math.min(
      Math.max(options?.limit ?? 20, 1),
      100,
    );

    const search = options?.search?.trim();
    const action = options?.action?.trim();
    const entity = options?.entity?.trim();

    const where: Prisma.AuditLogWhereInput = {
      ...(action
        ? {
            action,
          }
        : {}),

      ...(entity
        ? {
            entity,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                description: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                actorName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                actorEmail: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                action: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                entity: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      this.prisma.auditLog.count({
        where,
      }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================
  // GET SINGLE AUDIT LOG
  // =========================================================

  async findOne(id: number) {
    return this.prisma.auditLog.findUnique({
      where: {
        id,
      },
    });
  }

  // =========================================================
  // AVAILABLE FILTER VALUES
  // =========================================================

  async getFilters() {
    const [actions, entities] = await Promise.all([
      this.prisma.auditLog.findMany({
        distinct: ["action"],
        select: {
          action: true,
        },
        orderBy: {
          action: "asc",
        },
      }),

      this.prisma.auditLog.findMany({
        distinct: ["entity"],
        select: {
          entity: true,
        },
        orderBy: {
          entity: "asc",
        },
      }),
    ]);

    return {
      actions: actions.map((item) => item.action),
      entities: entities.map((item) => item.entity),
    };
  }

  // =========================================================
  // SANITIZE AUDIT VALUES
  // =========================================================

  private sanitizeValues(
    values: unknown,
  ): Prisma.InputJsonValue | undefined {
    if (values === undefined || values === null) {
      return undefined;
    }

    if (Array.isArray(values)) {
      return values.map((value) =>
        this.sanitizeValues(value),
      ) as Prisma.InputJsonArray;
    }

    if (typeof values === "object") {
      const sanitized: Record<
        string,
        Prisma.InputJsonValue
      > = {};

      const sensitiveFields = [
        "password",
        "passwordHash",
        "token",
        "accessToken",
        "refreshToken",
        "authorization",
        "secret",
        "apiKey",
      ];

      for (const [key, value] of Object.entries(
        values as Record<string, unknown>,
      )) {
        if (
          sensitiveFields.includes(key.toLowerCase())
        ) {
          sanitized[key] = "[REDACTED]";
          continue;
        }

        const sanitizedValue =
          this.sanitizeValues(value);

        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      }

      return sanitized;
    }

    if (
      typeof values === "string" ||
      typeof values === "number" ||
      typeof values === "boolean"
    ) {
      return values;
    }

    return String(values);
  }
}
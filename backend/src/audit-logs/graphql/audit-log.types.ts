import {
  Field,
  Int,
  ObjectType,
} from "@nestjs/graphql";

import GraphQLJSON from "graphql-type-json";

@ObjectType()
export class AuditLogType {
  @Field(() => Int)
  id!: number;

  @Field()
  action!: string;

  @Field()
  entity!: string;

  @Field(() => Int, { nullable: true })
  entityId?: number | null;

  @Field(() => Int, { nullable: true })
  actorId?: number | null;

  @Field(() => String, { nullable: true })
actorName?: string | null;

@Field(() => String, { nullable: true })
actorEmail?: string | null;

  @Field()
  description!: string;

  @Field(() => GraphQLJSON, { nullable: true })
  oldValues?: unknown;

  @Field(() => GraphQLJSON, { nullable: true })
  newValues?: unknown;

  @Field(() => String, { nullable: true })
ipAddress?: string | null;

@Field(() => String, { nullable: true })
userAgent?: string | null;

  @Field({ nullable: true })
  createdAt?: Date;
}

@ObjectType()
export class AuditLogPaginationType {
  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  totalPages!: number;
}

@ObjectType()
export class PaginatedAuditLogsType {
  @Field(() => [AuditLogType])
  data!: AuditLogType[];

  @Field(() => AuditLogPaginationType)
  pagination!: AuditLogPaginationType;
}

@ObjectType()
export class AuditLogFiltersType {
  @Field(() => [String])
  actions!: string[];

  @Field(() => [String])
  entities!: string[];
}
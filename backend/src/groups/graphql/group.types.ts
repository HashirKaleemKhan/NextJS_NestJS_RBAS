import { ObjectType, Field, Int } from "@nestjs/graphql";
import { PermissionType } from "../../roles/graphql/role.types";

@ObjectType()
export class GroupRoleType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;

  @Field(() => Boolean, { nullable: true })
  isAdmin?: boolean;
}

@ObjectType()
export class GroupPermissionRecordType {
  @Field(() => PermissionType)
  permission!: PermissionType;
}

@ObjectType()
export class GroupType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => [GroupPermissionRecordType], { nullable: true })
  permissions?: GroupPermissionRecordType[];

  @Field(() => [GroupRoleType], { nullable: true })
  roles?: GroupRoleType[];

  @Field({ nullable: true })
  createdAt?: Date;

  @Field({ nullable: true })
  updatedAt?: Date;
}

@ObjectType()
export class GroupPaginationType {
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
export class PaginatedGroupsType {
  @Field(() => [GroupType])
  data!: GroupType[];

  @Field(() => GroupPaginationType)
  pagination!: GroupPaginationType;
}


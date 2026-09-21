import { ObjectType, Field, Int } from "@nestjs/graphql";

@ObjectType()
export class RoleGroupType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean)
  active!: boolean;
}

@ObjectType()
export class PermissionType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Int, { nullable: true })
  parentId?: number | null;
}

@ObjectType()
export class RolePermissionItemType {
  @Field(() => PermissionType)
  permission!: PermissionType;
}

@ObjectType()
export class RoleReferenceType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean, { nullable: true })
  isAdmin?: boolean;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;
}

@ObjectType()
export class RoleUserType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;
}

@ObjectType()
export class RoleType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean)
  isAdmin!: boolean;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int, { nullable: true })
  groupId!: number | null;

  @Field(() => RoleGroupType, { nullable: true })
  group?: RoleGroupType | null;

  @Field(() => Int, { nullable: true })
  reportsToRoleId!: number | null;

  @Field(() => RoleReferenceType, { nullable: true })
  reportsToRole?: RoleReferenceType | null;

  @Field(() => [RoleUserType], { nullable: true })
  users?: RoleUserType[];

  @Field(() => [RolePermissionItemType], { nullable: true })
  permissions?: RolePermissionItemType[];

  @Field({ nullable: true })
  createdAt?: Date;

  @Field({ nullable: true })
  updatedAt?: Date;
}

@ObjectType()
export class RolePaginationType {
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
export class PaginatedRolesType {
  @Field(() => [RoleType])
  data!: RoleType[];

  @Field(() => RolePaginationType)
  pagination!: RolePaginationType;
}

@ObjectType()
export class GroupPermissionTreeType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => [PermissionType], { nullable: true })
  children?: PermissionType[];
}

@ObjectType()
export class GroupPermissionItemType {
  @Field(() => GroupPermissionTreeType)
  permission!: GroupPermissionTreeType;
}

@ObjectType()
export class GroupWithPermissionsType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => [GroupPermissionItemType], { nullable: true })
  permissions?: GroupPermissionItemType[];
}

@ObjectType()
export class GroupPermissionGroupType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => [PermissionType])
  children!: PermissionType[];
}


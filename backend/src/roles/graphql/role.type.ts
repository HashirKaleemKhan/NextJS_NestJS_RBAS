import {
  Field,
  Int,
  ObjectType,
} from "@nestjs/graphql";

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
export class RoleManagerType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Int)
  roleId!: number;
}

@ObjectType()
export class GroupType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  active!: boolean;
}

@ObjectType()
export class RolePermissionType {
  @Field(() => Int)
  roleId!: number;

  @Field(() => Int)
  permissionId!: number;

  @Field(() => PermissionType)
  permission!: PermissionType;
}

@ObjectType()
export class RoleType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  active!: boolean;

  @Field()
  isAdmin!: boolean;

  @Field(() => Int, {
    nullable: true,
  })
  groupId?: number | null;

  @Field(() => GroupType, {
    nullable: true,
  })
  group?: GroupType;

  @Field(() => Int, {
    nullable: true,
  })
  reportsToRoleId?: number | null;

  @Field(() => RoleType, {
    nullable: true,
  })
  reportsToRole?: RoleType;

  @Field(() => [RoleType])
  subordinateRoles!: RoleType[];

  @Field(() => [RoleUserType])
  users!: RoleUserType[];

  @Field(() => [RolePermissionType])
  permissions!: RolePermissionType[];
}

@ObjectType()
export class RoleUserType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => Int)
  roleId!: number;

  @Field(() => RoleManagerType, {
    nullable: true,
  })
  manager?: RoleManagerType;
}

@ObjectType()
export class GroupPermissionType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => [PermissionType])
  children!: PermissionType[];
}

@ObjectType()
export class GroupWithPermissionsType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  active!: boolean;

  @Field(() => [RolePermissionType])
  permissions!: RolePermissionType[];
}

@ObjectType()
export class RoleDeleteResultType {
  @Field()
  message!: string;
}
import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class GroupsPermissionNodeType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}

@ObjectType()
export class GroupsPermissionsRelationType {
  @Field(() => Int)
  groupId!: number;

  @Field(() => Int)
  permissionId!: number;

  @Field(() => GroupsPermissionNodeType)
  permission!: GroupsPermissionNodeType;
}

@ObjectType()
export class GroupsRoleType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Int, { nullable: true })
  groupId?: number | null;

  @Field(() => Int, { nullable: true })
  reportsToRoleId?: number | null;

  @Field()
  active!: boolean;

  @Field()
  isAdmin!: boolean;
}

@ObjectType()
export class GroupsGraphQLType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  active!: boolean;

  @Field(() => [GroupsPermissionsRelationType])
  permissions!: GroupsPermissionsRelationType[];

  @Field(() => [GroupsRoleType])
  roles!: GroupsRoleType[];
}

@ObjectType()
export class GroupsDeleteResultType {
  @Field()
  message!: string;
}
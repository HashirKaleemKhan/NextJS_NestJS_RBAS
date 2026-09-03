import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserRoleType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  isAdmin!: boolean;

  @Field()
  active!: boolean;

  @Field(() => UserRoleType, { nullable: true })
  reportsToRole?: UserRoleType | null;

  @Field(() => Int, { nullable: true })
  reportsToRoleId?: number | null;
}

@ObjectType()
export class UserManagerType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => UserRoleType, { nullable: true })
  role?: UserRoleType | null;
}

@ObjectType()
export class UserType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => UserRoleType)
  role!: UserRoleType;

  @Field(() => UserManagerType, { nullable: true })
  manager?: UserManagerType | null;

  @Field(() => Int, { nullable: true })
  managerId?: number | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class PossibleManagerType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => UserRoleType)
  role!: UserRoleType;
}

@ObjectType()
export class OrganizationHierarchyType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => UserRoleType)
  role!: UserRoleType;

  @Field(() => Int, { nullable: true })
  managerId?: number | null;

  @Field(() => [OrganizationHierarchyType])
  children!: OrganizationHierarchyType[];

  @Field()
  isCurrentUser!: boolean;
}

@ObjectType()
export class OrganizationHierarchyResultType {
  @Field(() => Int)
  currentUserId!: number;

  @Field()
  isAdmin!: boolean;

  @Field(() => [OrganizationHierarchyType])
  hierarchy!: OrganizationHierarchyType[];
}
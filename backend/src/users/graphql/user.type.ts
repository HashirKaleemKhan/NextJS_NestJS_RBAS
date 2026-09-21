import {
  Field,
  Int,
  ObjectType,
} from "@nestjs/graphql";

@ObjectType()
export class UserGroupType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;
}

@ObjectType()
export class UserRoleType {
  @Field(() => Int, { nullable: true })
  id?: number;

  @Field()
  name!: string;

  @Field(() => Int, { nullable: true })
  level?: number;

  @Field(() => Boolean, { nullable: true })
  active?: boolean;

  @Field(() => UserGroupType, {
    nullable: true,
  })
  group?: UserGroupType | null;
}

@ObjectType()
export class UserManagerType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}

@ObjectType()
export class UserType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => Int)
  roleId!: number;

  @Field(() => Int, { nullable: true })
  managerId!: number | null;

  @Field(() => Int, { nullable: true })
  groupId!: number | null;

  @Field(() => UserRoleType, {
    nullable: true,
  })
  role?: UserRoleType;

  @Field(() => UserManagerType, {
    nullable: true,
  })
  manager?: UserManagerType | null;

  @Field({ nullable: true })
  createdAt?: Date;

  @Field({ nullable: true })
  updatedAt?: Date;
}

@ObjectType()
export class UserPaginationType {
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
export class PaginatedUsersType {
  @Field(() => [UserType])
  data!: UserType[];

  @Field(() => UserPaginationType)
  pagination!: UserPaginationType;
}
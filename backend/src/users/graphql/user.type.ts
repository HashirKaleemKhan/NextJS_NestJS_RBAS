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
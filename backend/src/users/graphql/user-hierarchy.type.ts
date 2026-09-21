import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class HierarchyGroupType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;
}

@ObjectType()
export class HierarchyRoleType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field(() => Boolean)
  isAdmin!: boolean;

  @Field(() => HierarchyGroupType, {
    nullable: true,
  })
  group!: HierarchyGroupType | null;
}

@ObjectType()
export class UserHierarchyType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => Boolean)
  active!: boolean;

  @Field(() => HierarchyRoleType)
  role!: HierarchyRoleType;

  @Field(() => Int, {
    nullable: true,
  })
  managerId!: number | null;

  @Field(() => [UserHierarchyType])
  children!: UserHierarchyType[];

  @Field(() => Boolean)
  isCurrentUser!: boolean;
}
import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  password!: string;

  @Field(() => Int)
  roleId!: number;

  @Field(() => Int, { nullable: true })
  managerId?: number | null;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  password?: string;

  @Field(() => Int, { nullable: true })
  roleId?: number;

  @Field(() => Int, { nullable: true })
  managerId?: number | null;
}
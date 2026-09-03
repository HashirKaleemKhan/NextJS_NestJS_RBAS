import {
  Field,
  Int,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class AuthUserType {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  role!: string;

  @Field(() => [String])
  permissions!: string[];

  @Field()
  isAdmin!: boolean;
}

@ObjectType()
export class LoginResultType {
  @Field()
  accessToken!: string;

  @Field(() => AuthUserType)
  user!: AuthUserType;
}
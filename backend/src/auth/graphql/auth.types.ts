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

  @Field(() => Boolean)
  isAdmin!: boolean;

 @Field(() => Boolean, { nullable: true })
active?: boolean;
}

@ObjectType()
export class LoginResponseType {
  @Field()
  accessToken!: string;

  @Field(() => AuthUserType)
  user!: AuthUserType;
}

@ObjectType()
export class LogoutResponseType {
  @Field()
  message!: string;
}
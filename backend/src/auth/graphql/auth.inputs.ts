import {
  Field,
  InputType,
} from '@nestjs/graphql';

import {
  IsEmail,
  IsNotEmpty,
  MinLength,
} from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsNotEmpty()
  password!: string;
}

@InputType()
export class RegisterInput {
  @Field()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(6)
  password!: string;
}
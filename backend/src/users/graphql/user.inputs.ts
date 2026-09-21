import {
  InputType,
  Field,
  Int,
} from "@nestjs/graphql";

import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from "class-validator";

@InputType()
export class CreateUserInput {
  @Field()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(6)
  password!: string;

  @Field(() => Int)
  @IsInt()
  roleId!: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  roleId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class UpdateUserStatusInput {
  @Field()
  @IsBoolean()
  active!: boolean;
}
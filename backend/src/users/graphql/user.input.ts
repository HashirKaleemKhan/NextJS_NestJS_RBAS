import { Field, InputType, Int } from "@nestjs/graphql";
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

@InputType()
export class CreateUserInput {
  @Field()
  @IsString()
  name!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
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
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
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
}
import { Field, InputType, Int } from "@nestjs/graphql";

import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

@InputType()
export class CreateGroupInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @Field(() => [Int], { nullable: true })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permissionIds?: number[];
}

@InputType()
export class UpdateGroupInput {
  @Field({ nullable: true })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @Field(() => [Int], { nullable: true })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permissionIds?: number[];
}
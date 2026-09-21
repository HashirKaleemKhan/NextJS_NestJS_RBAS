import { InputType, Field, Int } from "@nestjs/graphql";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

@InputType()
export class CreateRoleInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  groupId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  reportsToRoleId?: number | null;

  @Field(() => [Int])
  @IsArray()
  @IsInt({ each: true })
  permissionIds!: number[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}

@InputType()
export class UpdateRoleInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  groupId?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  reportsToRoleId?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @Field(() => [Int], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  permissionIds?: number[];
}

@InputType()
export class UpdateRolePermissionsInput {
  @Field(() => [Int])
  @IsArray()
  @IsInt({ each: true })
  permissionIds!: number[];
}


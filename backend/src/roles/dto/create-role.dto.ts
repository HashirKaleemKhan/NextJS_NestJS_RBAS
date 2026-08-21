import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @IsOptional()
  groupId?: number;

  @IsArray()
  @IsInt({ each: true })
  permissionIds!: number[];

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}
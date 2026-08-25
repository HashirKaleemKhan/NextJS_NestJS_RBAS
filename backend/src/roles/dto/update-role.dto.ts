import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  groupId?: number | null;

  @IsOptional()
@IsInt()
reportsToRoleId?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsInt({ each: true })
  permissionIds?: number[];
}
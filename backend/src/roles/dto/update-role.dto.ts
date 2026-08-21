import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
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
  @Min(1)
  level?: number;

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
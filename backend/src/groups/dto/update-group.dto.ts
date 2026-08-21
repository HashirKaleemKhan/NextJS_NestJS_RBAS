import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  permissionIds?: number[];
}
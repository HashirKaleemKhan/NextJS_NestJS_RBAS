import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsInt,
} from "class-validator";

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permissionIds?: number[];
}
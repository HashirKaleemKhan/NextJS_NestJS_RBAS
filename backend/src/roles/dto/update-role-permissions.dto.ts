import {
  IsArray,
  IsInt,
} from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsInt({ each: true })
  permissionIds!: number[];
}
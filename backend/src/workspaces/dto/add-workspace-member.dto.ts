import { IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { MemberRole } from '../../generated/prisma/enums.js';

export class AddWorkspaceMemberDto {
  @IsUUID()
  userId!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(MemberRole)
  role?: MemberRole;
}

import { IsUUID } from 'class-validator';

export class AddWorkspaceMemberDto {
  @IsUUID()
  userId!: string;
}

import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'content must contain at least one non-whitespace character',
  })
  @MaxLength(10000)
  content!: string;
}

import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  // Password reset token received from the reset link
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token: string;

  // New password
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}
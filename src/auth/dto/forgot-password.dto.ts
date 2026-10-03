import {
  IsEmail,
  MaxLength,
} from 'class-validator';

export class ForgotPasswordDto {
  // Email address associated with the account
  @IsEmail()
  @MaxLength(254)
  email: string;
}
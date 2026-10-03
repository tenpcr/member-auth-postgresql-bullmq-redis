import {
  IsEmail,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  // User email address
  @IsEmail()
  @MaxLength(254)
  email: string;

  // User password
  @IsString()
  @MaxLength(128)
  password: string;
}

import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  // User email address
  @IsEmail()
  @MaxLength(254)
  email: string;

  // User password
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  // Optional first name
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstname?: string;

  // Optional last name
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastname?: string;
}
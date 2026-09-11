import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Numero de telephone invalide.' })
  phone: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caracteres.' })
  @MaxLength(64)
  password: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

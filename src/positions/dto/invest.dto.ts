import { IsString, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class InvestDto {
  @IsString()
  @IsNotEmpty({ message: 'Le slug du plan est requis.' })
  planSlug: string;

  @IsOptional()
  @IsNumber()
  @Min(2000, { message: 'Le montant minimum d\'investissement est de 2 000 FCFA.' })
  amount?: number;
}

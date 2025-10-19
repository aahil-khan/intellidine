import { IsPhoneNumber, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp!: string;
}

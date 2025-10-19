import { IsPhoneNumber, IsNotEmpty } from 'class-validator';

export class RequestOtpDto {
  @IsPhoneNumber('IN')
  @IsNotEmpty()
  phone!: string;
}

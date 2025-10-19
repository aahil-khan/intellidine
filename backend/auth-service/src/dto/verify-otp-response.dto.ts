export class VerifyOtpResponseDto {
  access_token!: string;
  expires_at!: string;
  user!: {
    id: string;
    phone_number: string;
    name?: string;
  };
}

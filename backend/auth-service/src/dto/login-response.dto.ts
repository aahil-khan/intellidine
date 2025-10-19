export class LoginResponseDto {
  access_token!: string;
  expires_at!: string;
  user!: {
    id: string;
    username: string;
    email: string;
    role: string;
    tenant_id?: string;
  };
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends PublicUser {
  passwordHash: string;
}

export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

export interface RefreshTokenCredential {
  hash: string;
  token: string;
}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { ApplicationConfig } from '../../../shared/config/configuration.interface';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthSessionRepository } from './repositories/auth-session.repository';
import { AuthUserRepository } from './repositories/auth-user.repository';
import { AuthSessionService } from './services/auth-session.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthUserService } from './services/auth-user.service';
import { PasswordService } from './services/password.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApplicationConfig, true>) => ({
        secret: configService.get('auth', { infer: true }).accessTokenSecret,
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthUserService,
    AuthSessionService,
    AuthTokenService,
    PasswordService,
    AccessTokenGuard,
    JwtStrategy,
    AuthUserRepository,
    AuthSessionRepository,
  ],
})
export class AuthModule {}

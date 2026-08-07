import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../../shared/openapi/api-endpoint.decorator';
import { ErrorResponseDto } from '../../../shared/openapi/dto/error-response.dto';
import { Session } from '../../../shared/session/session.decorator';
import type { SessionContext } from '../../../shared/session/session.types';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AccessTokenGuard } from './guards/access-token.guard';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiEndpoint({
    operation: { summary: 'Register with email and password' },
    body: { type: RegisterRequestDto, required: true },
    response: {
      status: HttpStatus.CREATED,
      description: 'The user was registered successfully',
      type: AuthResponseDto,
    },
    responses: [
      {
        status: HttpStatus.CONFLICT,
        description: 'The email address is already registered',
        type: ErrorResponseDto,
      },
    ],
  })
  register(@Body() input: RegisterRequestDto): Promise<AuthResponseDto> {
    return this.auth.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiEndpoint({
    operation: { summary: 'Log in with email and password' },
    body: { type: LoginRequestDto, required: true },
    response: {
      status: HttpStatus.OK,
      description: 'The user was authenticated successfully',
      type: AuthResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The email address or password is invalid',
        type: ErrorResponseDto,
      },
    ],
  })
  login(@Body() input: LoginRequestDto): Promise<AuthResponseDto> {
    return this.auth.login(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiEndpoint({
    operation: { summary: 'Rotate a refresh token and issue a new token pair' },
    body: { type: RefreshRequestDto, required: true },
    response: {
      status: HttpStatus.OK,
      description: 'The refresh token was rotated successfully',
      type: AuthResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The refresh token is invalid or expired',
        type: ErrorResponseDto,
      },
    ],
  })
  refresh(@Body() input: RefreshRequestDto): Promise<AuthResponseDto> {
    return this.auth.refresh(input.refreshToken);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiEndpoint({
    operation: { summary: 'Get the authenticated user' },
    response: {
      status: HttpStatus.OK,
      description: 'The authenticated user was retrieved successfully',
      type: UserResponseDto,
    },
    responses: [
      {
        status: HttpStatus.UNAUTHORIZED,
        description: 'The access token is missing or invalid',
        type: ErrorResponseDto,
      },
    ],
  })
  me(@Session() session: SessionContext): Promise<UserResponseDto> {
    return this.auth.me(session.userId);
  }
}

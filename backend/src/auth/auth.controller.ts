import { BadRequestException, Headers, Body, ConflictException, Controller, NotAcceptableException, NotFoundException, Post, UnauthorizedException, UseGuards, Param, ParseUUIDPipe, Patch, Get, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBadGatewayResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiProperty, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import RegiesterDto from './dto/register.dto';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import UserDto from 'src/user/dto/user.dto';
import { ANOTHER_ERROR_RESPONE, CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE, UNAUTHORIZED_CODE } from 'src/common/code';
import LoginDto from './dto/login.dto';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { deserialize } from 'v8';
import AuthDto from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import { ENV } from 'src/common/env';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserAccessGaurd } from './guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import { plainToInstance } from 'class-transformer';
import { measureMemory } from 'vm';
import { AuthGuard } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { reportUnhandledError } from 'rxjs/internal/util/reportUnhandledError';
@ApiTags('auth')
@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService) { }


  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    console.log('a')
  }

  @Get('google-redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req ) {
    const { statusCode, message, data } = await this.authService.handleGoogleLogin(req.user);

    if (statusCode === CREATED_RESPONE)
      return {
        statusCode, message, data
      }


    throw new BadRequestException(statusCode, message)
    // Cách 1: Trả về JSON (thường dùng cho test hoặc API thuần)
    // return res.json(result);

    // Cách 2: Redirect về Frontend kèm Token trên URL (Phổ biến cho SPA)
    // const frontendUrl = `http://localhost:3000/login-success?token=${result.access_token}`;
    // return res.redirect(frontendUrl);
  }



  @Post("/register")

  @ApiNotFoundResponse()
  @ApiCreatedResponse()
  @ApiBadGatewayResponse()
  @ApiConflictResponse()
  async register(@Body() registerDto: RegiesterDto): Promise<ResponseDto<UserDto>> {
    const { statusCode, message, data }: ResponseDto<UserDto> = await this.authService.register(registerDto);
    if (statusCode === NOTFOUND_CODE)
      throw new NotAcceptableException(statusCode, message)
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === CREATED_RESPONE)
      return {
        statusCode, message, data
      }


    throw new BadRequestException(
      statusCode, message
    )
  }



  @Post("/login")

  async login(@Body() loginDto: LoginDto): Promise<ResponseDto<AuthDto>> {
    const { statusCode, message, data }: ResponseDto<AuthDto> = await this.authService.login(loginDto);

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === UNAUTHORIZED_CODE)
      throw new UnauthorizedException(statusCode, message)
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data
      }
    throw new BadRequestException(statusCode, message);
  }

  @Post("/refreshToken/:userID")
  @ApiOkResponse(
  )
  @ApiUnauthorizedResponse()
  @ApiBadGatewayResponse()
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'for me'
  })

  @UseGuards(JwtAuthGuard, UserAccessGaurd)

  @RequirePermission('me')
  async refreshToken(@Param('userID', new ParseUUIDPipe()) userID: string, @Body() token: RefreshTokenDto): Promise<ResponseDto<AuthDto>> {
    const { statusCode, message, data }: ResponseDto<AuthDto> = await this.authService.refreshToken(userID, token.refreshToken);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === UNAUTHORIZED_CODE)
      throw new UnauthorizedException(statusCode, message);
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data
      }
    throw new BadRequestException(ANOTHER_ERROR_RESPONE);
  }

  @ApiOperation({
    summary: 'for me'
  })
  @ApiOkResponse(
  )

  @UseGuards(JwtAuthGuard, UserAccessGaurd)

  @RequirePermission('me')
  @ApiUnauthorizedResponse()
  @ApiBadGatewayResponse()
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()

  @Post("/logout")
  async logout(userID: string): Promise<ResponseDto<AnotherError>> {

    const { statusCode, message, data }: ResponseDto<AnotherError> = await this.authService.logout(userID);

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === UNAUTHORIZED_CODE)
      throw new UnauthorizedException(statusCode, message);
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data
      }
    throw new BadRequestException(ANOTHER_ERROR_RESPONE);
  }

  @Patch('ban/:userID')
  @ApiOperation({ summary: 'for admin' })
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiBearerAuth()
  async ban(@Param('userID', new ParseUUIDPipe()) userID: string) {
    const { statusCode, message, data }: ResponseDto<UserDto> = await this.authService.ban(userID, true);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === OK_CODE)
      return {
        statusCode, message, data
      }

    throw new BadRequestException(statusCode, message)
  }



  @Patch('unban/:userID')
  @ApiOperation({ summary: 'for admin' })
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiBearerAuth()
  async unBan(@Param('userID', new ParseUUIDPipe()) userID: string) {
    const { statusCode, message, data }: ResponseDto<UserDto> = await this.authService.ban(userID, false);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === OK_CODE)
      return {
        statusCode, message, data
      }

    throw new BadRequestException(statusCode, message)
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PassportStrategy } from '@nestjs/passport';
import { User } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { OK_CODE } from 'src/common/code';
import { ENV } from 'src/common/env';
import ResponseDto from 'src/common/response.dto';
import FullUserDto from 'src/user/dto/full-user.dto';
import UserDto from 'src/user/dto/user.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly userService : UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ENV.JWT.ACCESS_SECRET || 'SECRET',
    });
  }

  async validate(payload: any) {
    if (!payload.userID) {
      throw new UnauthorizedException('Token không hợp lệ');
    }

    const {statusCode , message , data} : ResponseDto<FullUserDto>= await this.userService.getUserByUserID(payload.userID)
    if (statusCode!==OK_CODE || data=== undefined)
      throw new UnauthorizedException('userID is not found')

    if (data.isActive !== true)
      throw new UnauthorizedException('This account is blocked')
    return { 
      userID: payload.userID, 
      username: payload.username,
      email: payload.email, 
      roleId: payload.roleId ,
      departmentID : payload.departmentID
    };
  }
}
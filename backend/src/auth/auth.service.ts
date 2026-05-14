import { Injectable } from '@nestjs/common';
import RegiesterDto from './dto/register.dto';
import UserDto from 'src/user/dto/user.dto';
import { UserService } from 'src/user/user.service';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import { ANOTHER_ERROR_RESPONE, BADREQUEST_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE, UNAUTHORIZED_CODE } from 'src/common/code';
import * as jwt from 'jsonwebtoken'
import LoginDto from './dto/login.dto';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import AuthDto from './dto/auth.dto';
import FullUserDto from 'src/user/dto/full-user.dto';
import { plainToInstance } from 'class-transformer';
import { ENV } from 'src/common/env';
import * as crypto from 'crypto'
import { use } from 'passport';

@Injectable()
export class AuthService {

    constructor(private userService: UserService,
        private bcryptHashedservice: BycyptHashedService) {
    }
    async register(registerDto: RegiesterDto): Promise<ResponseDto<UserDto>> {
        const { email, username, password, departmentName }: RegiesterDto = registerDto

        const { statusCode, message, data }: ResponseDto<UserDto> | AnotherError = await this.userService.createUser({ email, username, password, departmentName });
        if (statusCode !== CREATED_RESPONE)
            return {
                statusCode, message
            }

        return {
            statusCode,
            message,
            data: plainToInstance(UserDto, data, { excludeExtraneousValues: true })
        }
    }


    async login(loginDto: LoginDto): Promise<ResponseDto<AuthDto>> {
        const { username, password }: LoginDto = loginDto

        const { statusCode, message, data }: ResponseDto<FullUserDto> = await this.userService.getUserByUserName(username);
        if (statusCode !== OK_CODE || data === undefined)
            return {
                statusCode,
                message
            }

        if (data.isActive !== true)
            return {
                statusCode: UNAUTHORIZED_CODE,
                message: 'This userID was banned'
            }

        if (data !== undefined) {
            const hashed: string = data?.hashedPassword || ''

            if (! await this.bcryptHashedservice.compare(password, hashed))
                return { statusCode: BADREQUEST_CODE, message: 'The password is wrong' }



            const newAcessToken = await this.genAccessToken(loginDto.username, data?.userID, data?.email, data?.roleId, data?.departmentID);
            const newRefreshToken = await this.genRefreshToken(data?.userID || '', loginDto.username, data?.email || '');
            const userGet = await this.userService.updateUser(data?.userID || '', { refreshToken: newRefreshToken })
            if (userGet.statusCode !== OK_CODE)
                return { statusCode, message }

            const user: UserDto = data;
            return {
                statusCode: CREATED_RESPONE,
                message: 'login successfull',
                data: {
                    accessToken: newAcessToken,
                    refreshToken: newRefreshToken,
                    user: plainToInstance(UserDto, user, { excludeExtraneousValues: true })
                }
            }
        }
        return { statusCode: BADREQUEST_CODE, message: 'another error' }
    }

    async genAccessToken(username: string | undefined, userID: string | undefined, email: string | undefined, roleId: string | null | undefined, departmentID: string | null | undefined) {

        const payload = {
            userID,
            username,
            email,
            roleId,
            departmentID
        }

        const acessToken = jwt.sign(payload, ENV.JWT.ACCESS_SECRET, {
            expiresIn: '15m'
        })

        return acessToken
    }

    async genRefreshToken(userID: string, username: string, email: string) {
        const payload = {
            userID,
            username,
            email
        }

        const refreshToken = jwt.sign(payload, ENV.JWT.REFRESH_SECRET, {
            expiresIn: '7d'
        })

        return refreshToken
    }

    async refreshToken(userID: string, refreshToken: string): Promise<ResponseDto<AuthDto>> {
        const { statusCode, message, data }: ResponseDto<FullUserDto> = await this.userService.getUserByUserID(userID);
        if (statusCode != OK_CODE || data === undefined)
            return {
                statusCode, message
            }

        if (data.refreshToken !== refreshToken)
            return {
                statusCode: UNAUTHORIZED_CODE,
                message: 'refreshToken khong dung '
            }

        if (data.isActive !== true) {
            return {
                statusCode: BADREQUEST_CODE,
                message: 'user is banned'
            }
        }

        const newAcessToken: string = await this.genAccessToken(data.username, data.userID, data.email, data?.roleId, data?.departmentID)
        const newRefreshToken: string = await this.genRefreshToken(data.userID, data.username, data.email)

        const updateUser: ResponseDto<UserDto> = await this.userService.updateUser(data.userID, { refreshToken: newRefreshToken })

        if (updateUser.statusCode !== OK_CODE)
            return {
                statusCode, message
            }
        return {
            statusCode: CREATED_RESPONE,
            message: `update refreshToken successfull`,
            data: {
                refreshToken: newRefreshToken,
                accessToken: newAcessToken,
                user: plainToInstance(UserDto, updateUser.data, { excludeExtraneousValues: true })
            }
        }
    }

    async logout(userID: string): Promise<ResponseDto<AnotherError>> {

        const { statusCode, message, data } = await this.userService.updateUser(userID, { refreshToken: undefined })

        return { statusCode: CREATED_RESPONE, message: 'log out successfully' }
    }



    async ban(userID: string, banValue: boolean): Promise<ResponseDto<UserDto>> {
        const { statusCode, message, data }: ResponseDto<UserDto> = await this.userService.updateUser(userID, { isActive: banValue ? false : true })
        if (statusCode === OK_CODE)
            return {
                statusCode, message, data: plainToInstance(UserDto, data, { excludeExtraneousValues: true })
            }
        return {
            statusCode, message, data
        }
    }



    async handleGoogleLogin(googleUser: any): Promise<ResponseDto<AuthDto>> {
        let user: ResponseDto<UserDto> = await this.userService.getUserByEmail(googleUser.email)


        const password: string = crypto.randomBytes(12).toString('base64');
        if (user.statusCode !== OK_CODE) {

            user = await this.register({
                username:googleUser.email,
                email: googleUser.email, 
                password
            })            
        }

        if (user.data === undefined)
            return {
                statusCode: UNAUTHORIZED_CODE,
                message: 'Another error'
            }

       
        const accessToken = await  this.genAccessToken(user.data.username , user.data.userID,user.data.email , user.data.roleId ,user.data.departmentID);
        const refreshToken = await this.genRefreshToken(user.data.userID ,user.data.username,
            user.data.email
        )
        const newUser = await this.userService.updateUser(user.data.userID , {refreshToken});
        return{
            statusCode: CREATED_RESPONE,
            message: 'Login successfull',
            data:{
                accessToken,
                refreshToken ,
                user: newUser.data
            }
        }
    }
}

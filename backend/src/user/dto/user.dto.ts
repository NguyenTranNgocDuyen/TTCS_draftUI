import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsDate, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";


export default class UserDto {

    @Expose()
    @IsString()
    @IsUUID()
    userID: string
    @ApiProperty({
        description: 'email',
        example: "abc@gmail.com",
        required: true
    })
    @Expose()
    @IsString()
    @IsEmail()
    email: string

    @ApiProperty({
        description: 'username',
        example: "hahaha",
        required: true
    })
    @Expose()

    @IsString()
    username: string

    @Expose()
    @IsString()
    @IsUUID()
    @IsOptional()
    departmentID: string | null

    @Expose()
    @IsString()
    @IsOptional()
    roleId: string | null

    @Expose()
    @IsBoolean()
    @IsOptional()
    isActive? : boolean | null

    @IsString()
    @IsOptional()
    refreshToken?: string | null
};
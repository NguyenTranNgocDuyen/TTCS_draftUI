import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, ConflictException, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { TypeLeaveService } from './type-leave.service';
import { CreateTypeLeaveDto } from './dto/create-type-leave.dto';
import { UpdateTypeLeaveDto } from './dto/update-type-leave.dto';

import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ANOTHER_ERROR_RESPONE, CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE } from 'src/common/code';
import { TypeLeaveDto } from './dto/type-leave.dto';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';

@Controller('type-leave')
export class TypeLeaveController {
  constructor(private readonly typeLeaveService: TypeLeaveService) {}

  @Post()
  @ApiOperation({ summary: 'for admin' })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiCreatedResponse({ description: 'Create Type Leave successful' })
  @ApiConflictResponse({ description: 'Name type leave existed' })
  async create(@Body() createTypeLeaveDto: CreateTypeLeaveDto): Promise<ResponseDto<TypeLeaveDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<TypeLeaveDto> = await this.typeLeaveService.create(createTypeLeaveDto);
    
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);
    else if (statusCode === CREATED_RESPONE) {
      return { statusCode, message, data };
    }
    
    return ANOTHER_ERROR_RESPONE;
  }

  @Get()
  @ApiOperation({ summary: 'for admin' })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiOkResponse({ description: 'Get all type leaves successful' })
  async findAll(): Promise<ResponseDto<TypeLeaveDto[]> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<TypeLeaveDto[]> = await this.typeLeaveService.findAll(); 
    
    if (statusCode === OK_CODE) {
      return { statusCode, message, data };
    }
    
    return ANOTHER_ERROR_RESPONE;
  }

  @Get('getTypeLeaveByID/:TypeleaveId')
  @ApiOperation({ summary: 'for admin' })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiOkResponse({ description: 'Get type leave id = ?? successful' })
  @ApiNotFoundResponse({ description: 'Type Leave id is not exist' })
  @ApiBadRequestResponse({ description: 'Validation failed (uuid is expected)' })
  async findOne(@Param('TypeleaveId', new ParseUUIDPipe()) TypeleaveId: string): Promise<ResponseDto<TypeLeaveDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<TypeLeaveDto> = await this.typeLeaveService.findOne(TypeleaveId);
    
    if (statusCode === NOTFOUND_CODE) {
      throw new NotFoundException('Type Leave id is not exist');
    }
    if (statusCode === OK_CODE) {
      return { statusCode, message, data };
    }
    
    return ANOTHER_ERROR_RESPONE;
  }

  @Patch(':typeLeaveId')
  @ApiOperation({ summary: 'for admin' })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiOkResponse({ description: 'Update type leave having id = ?? successful' })
  @ApiNotFoundResponse({ description: 'Type Leave id is not exist' })
  @ApiBadRequestResponse({ description: 'Update type leave not successfully' })
  @ApiConflictResponse({ description: "The type leave's name must be unique" })
  async update(@Param('typeLeaveId', new ParseUUIDPipe()) typeLeaveId: string, @Body() updateTypeLeaveDto: UpdateTypeLeaveDto): Promise<ResponseDto<TypeLeaveDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<TypeLeaveDto> | AnotherError = await this.typeLeaveService.update(typeLeaveId, updateTypeLeaveDto);
    
    if (statusCode === CONFLIG_CODE) throw new ConflictException(statusCode, message);
    if (statusCode === NOTFOUND_CODE) throw new NotFoundException(statusCode, message);

    if (statusCode === OK_CODE) {
      return { statusCode, message, data };
    }

    return ANOTHER_ERROR_RESPONE;
  }

  @Delete(':typeLeaveId')
  @ApiOperation({ summary: 'for admin' })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiOkResponse({ description: 'Delete type leave having id = ?? successful' })
  @ApiNotFoundResponse({ description: 'Type Leave id is not exist' })
  @ApiBadRequestResponse({ description: 'Validation failed (uuid is expected) or Type leave is in use' })
  async remove(@Param('typeLeaveId', new ParseUUIDPipe()) typeLeaveId: string): Promise<ResponseDto<TypeLeaveDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<TypeLeaveDto> = await this.typeLeaveService.remove(typeLeaveId);
    
    if (statusCode === NOTFOUND_CODE) throw new NotFoundException(statusCode, message);
    if (statusCode === OK_CODE) {
      return { statusCode, message };
    }
    
    throw new BadRequestException(message);
  }

  @Get('/getTypeLeaveByName/:nameTypeLeave')
  @ApiOperation({ summary: 'for admin' })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiOkResponse({ description: 'Get type leave successful' })
  @ApiNotFoundResponse({ description: 'The nameTypeLeave = ?? is not found' })
  async getTypeLeaveByName(@Param('nameTypeLeave') nameTypeLeave: string): Promise<ResponseDto<TypeLeaveDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<TypeLeaveDto> = await this.typeLeaveService.getTypeLeaveByName(nameTypeLeave);
    
    if (statusCode === NOTFOUND_CODE) {
      throw new NotFoundException(`The nameTypeLeave = ${nameTypeLeave} is not found`);
    }
    if (statusCode === OK_CODE) {
      return { statusCode, message, data };
    }
    throw new BadRequestException(message);
  }
}
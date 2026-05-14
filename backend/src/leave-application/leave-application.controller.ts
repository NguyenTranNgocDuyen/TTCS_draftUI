import { 
  BadRequestException, 
  Body, 
  ConflictException, 
  Controller, 
  NotFoundException, 
  Param, 
  ParseUUIDPipe, 
  Patch, 
  Post, 
  Req, 
  UseGuards 
} from '@nestjs/common';
import { LeaveApplicationService } from './leave-application.service';
import { DefaultResponse } from 'src/common/response.dto';
import { CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE } from 'src/common/code';
import { 
  ApiBadRequestResponse, 
  ApiBearerAuth, 
  ApiConflictResponse, 
  ApiNotFoundResponse, 
  ApiOkResponse, 
  ApiOperation, 
  ApiTags 
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import ReviewAuthGuards from 'src/auth/guards/reviwer.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import CreateLeaveApplicationDto from './dto/create-leave-application.dto';
import ReviewLeaveApplicationDto from './dto/review-leave-application.dto';
import LeaveApplicationAuthGuard from 'src/auth/guards/leaveApplication.guard';

@ApiTags('leave-application')
@Controller('leave-application')
export class LeaveApplicationController {
  constructor(private readonly leaveApplicationService: LeaveApplicationService) { }

  @Post('/:userID')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)

  @RequirePermission('me')
  @ApiOperation({ summary: "for me" })
  async createLeaveApplication(
    @Param('userID', new ParseUUIDPipe()) userID: string, 
    @Body() createLeaveApplication: CreateLeaveApplicationDto
  ): Promise<DefaultResponse> {

    const { statusCode, message, data } = await this.leaveApplicationService.createLeaveApplication(userID, createLeaveApplication);
    
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message);
  }


  @Patch('/reviewLeaveApplication/:leaveApplicationID')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, LeaveApplicationAuthGuard)
  
  @RequirePermission('manager')
  async reviewLeaveApplication(
    @Param('leaveApplicationID', new ParseUUIDPipe()) leaveApplicationID: string, 
    @Body() reviewLeaveApplicationDto: ReviewLeaveApplicationDto,
    @Req() request: any
  ): Promise<DefaultResponse> {
    
    const managerID = request.user.userID;

    const { statusCode, message, data } = await this.leaveApplicationService.reviewLeaveApplication(leaveApplicationID, managerID, reviewLeaveApplicationDto);

    if (statusCode === OK_CODE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message);
  }


  @Patch('/cancelLeaveApplication/:leaveApplicationID')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  // Dùng UserAccessGaurd và quyền 'me' vì đây là hành động của chính user thực hiện trên đơn của họ
  @UseGuards(JwtAuthGuard, LeaveApplicationAuthGuard) 
  @RequirePermission('me')
  @ApiOperation({ summary: "for me " })
  async cancelLeaveApplication(
    @Param('leaveApplicationID', new ParseUUIDPipe()) leaveApplicationID: string,
    @Req() request: any
  ): Promise<DefaultResponse> {
    
    // Lấy userID từ JWT payload của người đang thực hiện request (nhân viên)
    const userID = request.user.userID;

    const { statusCode, message, data } = await this.leaveApplicationService.cancelLeaveApplication(
      leaveApplicationID, 
      userID
    );

    if (statusCode === OK_CODE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message);
  }
}
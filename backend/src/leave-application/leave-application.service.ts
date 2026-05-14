import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { DepartmentService } from 'src/department/department.service';
import { NotificationService } from 'src/notification/notification.service';
import { Prisma } from '@prisma/client';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';
import { OK_CODE, CREATED_RESPONE, NOTFOUND_CODE, CONFLIG_CODE, Interval_Server_Network_Exeception_Code, nameTypeLeave_AnnualLeave, PENDING, ACCEPTED, REJECTED, CANCELED } from 'src/common/code';
import { nowVN } from 'src/common/time';
import CreateLeaveApplicationDto from './dto/create-leave-application.dto';
import ReviewLeaveApplicationDto from './dto/review-leave-application.dto';
import { TypeLeaveService } from 'src/type-leave/type-leave.service';


@Injectable()
export class LeaveApplicationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly departmentService: DepartmentService,
    private readonly notificationService: NotificationService,
    private readonly typeLeaveService : TypeLeaveService
  ) {}

  async createLeaveApplication(userID: string, createDto: CreateLeaveApplicationDto, tx?: Prisma.TransactionClient): Promise<ResponseDto<any>> {
    try {
      const executeLogic = async (dCbt: Prisma.TransactionClient): Promise<ResponseDto<any>> => {
        const user = await this.userService.getUserByUserID(userID, dCbt);
        if (user.statusCode !== OK_CODE || user.data === undefined || user.data.departmentID === null || user.data.departmentID === undefined) {
            if (user.data?.departmentID === undefined || user.data.departmentID === null)
                throw new NotFoundException('Dont have departmetID')
          throw new BadRequestException(user.message);
        }

        const department = await this.departmentService.getDepartmentById(user.data.departmentID, dCbt);
        if (department.statusCode !== OK_CODE || department.data === undefined) {
          throw new BadRequestException(department.message);
        }

        const reviewerID = department.data.managerID;
        if (reviewerID === undefined || reviewerID === null) {
          throw new BadRequestException("Please update managerID for this department before creating leave application !!!! ");
        }
        const typeLeave = await this.typeLeaveService.findOne(createDto.typeLeaveID ,dCbt);
        if (typeLeave.statusCode !== OK_CODE)
            throw new NotFoundException(typeLeave.message)

        
        if (typeLeave.data?.nameTypeLeave === nameTypeLeave_AnnualLeave && user.data.remainDaysofLeave !== undefined && user.data.remainDaysofLeave < createDto.duration)
            throw new BadRequestException('Not enough remaining days of annual leave ')
        const leaveApp = await dCbt.leaveApplication.create({
          data: {
            senderID: userID,
            typeLeaveID: createDto.typeLeaveID,
            startDate: new Date(createDto.startDate),
            endDate: new Date(createDto.endDate),
            duration: createDto.duration,
            reason: createDto.reason,
            status: PENDING,
          },
        });

        const notificationGet = await this.notificationService.sendNotification(
          userID,
          {
            receiverID: reviewerID,
            content: `New leave application needs to be reviewed from employee userID = ${userID} at ${nowVN}`,
          },
          dCbt,
        );

        if (notificationGet.statusCode !== CREATED_RESPONE) {
          throw new BadRequestException(notificationGet.message);
        }

        return {
          statusCode: CREATED_RESPONE,
          message: 'Leave application created successfully',
          data: leaveApp,
        };
      };

      if (tx) return await executeLogic(tx);
      return await this.prismaService.$transaction(async (tx) => executeLogic(tx));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error creating leave application:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error occurred while creating leave application',
      };
    }
  }
async reviewLeaveApplication(leaveApplicationID: string, managerID: string, reviewDto: ReviewLeaveApplicationDto, tx?: Prisma.TransactionClient): Promise<ResponseDto<any>> {
    const { accept, reasonReject } = reviewDto;
    
    try {
      const executeLogic = async (dCbt: Prisma.TransactionClient): Promise<ResponseDto<any>> => {
        
        // 1. Lấy thông tin đơn xin nghỉ
        const leaveAppGet = await dCbt.leaveApplication.findUnique({
          where: { leaveApplicationID },
        });

        if (!leaveAppGet || !leaveAppGet.senderID) {
          throw new NotFoundException('Leave application not found');
        }

        if (leaveAppGet.status !== PENDING) {
          throw new BadRequestException(`Cannot review application with status: ${leaveAppGet.status}`);
        }

        const now = new Date();
        
        const leaveAppUpdate = await dCbt.leaveApplication.update({
          where: { leaveApplicationID },
          data: {
            status: accept ? ACCEPTED : REJECTED,
            reasonReject: accept ? null : reasonReject,
            reviewerID: managerID, 
            reviewedAt: now,
          },
        });

        const typeLeave = await this.typeLeaveService.findOne(leaveAppUpdate.typeLeaveID, dCbt);
        
        if (typeLeave.data !== undefined && typeLeave.data.nameTypeLeave === nameTypeLeave_AnnualLeave && accept === true) {
            
            const userCheck = await dCbt.user.findUnique({
                where: { userID: leaveAppUpdate.senderID },
                select: { remainDaysofLeave: true }
            });

            if (!userCheck) {
                throw new NotFoundException('User sender not found');
            }

            if (userCheck.remainDaysofLeave === undefined || userCheck.remainDaysofLeave === null || userCheck.remainDaysofLeave < leaveAppUpdate.duration) {
                throw new BadRequestException('The employee does not have enough remaining leave days to approve this application.');
            }

            await dCbt.user.update({
                where: {
                    userID: leaveAppUpdate.senderID
                },
                data: {
                    remainDaysofLeave: {
                        decrement: leaveAppUpdate.duration
                    }
                }
            });
        }

        const notificationGet = await this.notificationService.sendNotification(
          managerID, 
          {
            receiverID: leaveAppGet.senderID,
            content: `Your leave application created at ${leaveAppUpdate.createdAt} was ${accept ? 'approved' : 'rejected'} by your manager at ${nowVN}. ${!accept ? `Reason: ${leaveAppUpdate.reasonReject}` : ''}`,
          },
          dCbt,
        );

        if (notificationGet.statusCode !== CREATED_RESPONE) {
          throw new BadRequestException(notificationGet.message);
        }

        return {
          statusCode: OK_CODE,
          message: 'Reviewed leave application successfully',
          data: leaveAppUpdate,
        };
      };

      if (tx) return await executeLogic(tx);
      return await this.prismaService.$transaction(async (tx) => executeLogic(tx));
      
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error reviewing leave application:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error occurred',
      };
    }
  }
  async cancelLeaveApplication(leaveApplicationID: string, userID: string, tx?: Prisma.TransactionClient): Promise<DefaultResponse> {
    try {
      const executeLogic = async (dCbt: Prisma.TransactionClient): Promise<DefaultResponse> => {
        const leaveAppGet = await dCbt.leaveApplication.findUnique({
          where: { leaveApplicationID },
        });

        if (!leaveAppGet) throw new NotFoundException('Leave application not found');
        if (leaveAppGet.senderID !== userID) throw new BadRequestException('You do not have permission to cancel this application');
        if (leaveAppGet.status !== PENDING) throw new BadRequestException('Can only cancel pending applications');

        await dCbt.leaveApplication.update({
          where: { leaveApplicationID },
          data: {
            status: CANCELED,
          },
        });

        return {
          statusCode: OK_CODE,
          message: 'Leave application cancelled successfully',
        };
      };

      if (tx) return await executeLogic(tx);
      return await this.prismaService.$transaction(async (tx) => executeLogic(tx));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error cancelling leave application:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error occurred',
      };
    }
  }
}
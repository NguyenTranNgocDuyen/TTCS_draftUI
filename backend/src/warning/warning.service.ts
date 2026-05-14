import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { CreateWarningDto } from './dto/create-warning.dto';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';
import WarningDto from './dto/warning.dto';
import { constTimeZone, CREATED_RESPONE, OK_CODE } from 'src/common/code';
import { AttendanceModuleService } from 'src/attendance-module/attendance-module.service';
import { Cron } from '@nestjs/schedule';
import { compareSync } from 'bcrypt';
import { time } from 'console';
import { MonthlyTimeSheetService } from 'src/monthly-time-sheet/monthly-time-sheet.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WarningService {
  constructor(private readonly userService: UserService,
    private readonly prismaService: PrismaService,
    private readonly attendenceService: AttendanceModuleService,
  ) { }
  async sendWarning(createWarningDto: CreateWarningDto, tx? : Prisma.TransactionClient): Promise<ResponseDto<WarningDto>> {

    const now = new Date()
    const { userID, content } = createWarningDto
    const db : Prisma.TransactionClient = tx?? this.prismaService;
    const userGet = await this.userService.getUserByUserID(userID , tx );

    if (userGet.statusCode !== OK_CODE || userGet.data === undefined)
      return {
        statusCode: userGet.statusCode,
        message: userGet.message
      }




    const warning: WarningDto = await db.warning.create({
      data: {
        userID,
        content,
      }
    })

    return {
      statusCode: CREATED_RESPONE,
      message: 'Created warning successfull !!!!',
      data: warning
    }

  }


  @Cron('59 59 23 * * *', {
  timeZone: constTimeZone,
})
  async warningEmployeeMissedCheckOut(tx? : Prisma.TransactionClient): Promise<ResponseDto<DefaultResponse>> {

    const db : Prisma.TransactionClient = tx ?? this.prismaService;
    const now = new Date()
    const todayLocalString = now.toLocaleDateString('sv-SE', { 
    timeZone: constTimeZone 
  }); 
    const { statusCode, message, data } = await this.attendenceService.GetAllEmployeeDindNotCheckOutOfDay(todayLocalString, tx)
    if (statusCode !== OK_CODE || data === undefined) {
      return { statusCode, message }
    }
    if (data.length === 0)
      return {
        statusCode: OK_CODE,
        message: "Don't have any employee missed check out"
      }

    for (var timesheetEntry  of data) {

      const monthly = await db.monthlyTimesheet.findUnique({
        where:{
          monthlyTimesheetID : timesheetEntry.monthlyTimesheetID
        }
      });

      if (monthly === null){
        console.log(`monthlyTimesheetID = ${timesheetEntry.monthlyTimesheetID} is not found !!! `)
        continue
      }
      var sendWarning = await this.sendWarning({ userID: monthly.userID, content: `Missed checked out in day ${now.toLocaleDateString()}` }, tx )
      if (sendWarning.statusCode !== CREATED_RESPONE)
        return {
          statusCode: sendWarning.statusCode,
          message: 'sendWarning not successfull because' + sendWarning.message
        }
    }

    return {
      statusCode: CREATED_RESPONE,
      message: 'Send warning successfull!!!'
    }


  }
}

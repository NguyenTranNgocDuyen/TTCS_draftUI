import { forwardRef, Module } from '@nestjs/common';
import { LeaveApplicationService } from './leave-application.service';
import { LeaveApplicationController } from './leave-application.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import DepartmentDto from 'src/department/dto/department.dto';
import { NotificationModule } from 'src/notification/notification.module';
import { DepartmentModule } from 'src/department/department.module';
import { TypeLeaveModule } from 'src/type-leave/type-leave.module';

@Module({
  controllers: [LeaveApplicationController],
  providers: [LeaveApplicationService],
  imports: [forwardRef(() => PrismaModule) , forwardRef(() => UserModule) , 
    forwardRef(()=>DepartmentModule), forwardRef(()=> NotificationModule),
  forwardRef(() => TypeLeaveModule)]
})
export class LeaveApplicationModule {}

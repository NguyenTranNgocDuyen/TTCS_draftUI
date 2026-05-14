import { 
    BadRequestException, 
    CanActivate, 
    ExecutionContext, 
    ForbiddenException, 
    Injectable, 
    NotFoundException, 
    UnauthorizedException 
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Department } from "@prisma/client";
import { dateTimestampProvider } from "rxjs/internal/scheduler/dateTimestampProvider";
import { OK_CODE } from "src/common/code";
import { DepartmentService } from "src/department/department.service";
import { PrismaService } from "src/prisma/prisma.service";
import { UserService } from "src/user/user.service";

@Injectable()
export default class LeaveApplicationAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prismaService: PrismaService,
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {

        // Lấy danh sách permission được define từ Decorator (vd: @RequirePermission('manager'))
        const allowedPermission = this.reflector.get<string[]>('permission', context.getHandler());

        if (!allowedPermission)
            return true;

        const request = context.switchToHttp().getRequest();
        const currentUser = request.user;

        // Lấy leaveApplicationID từ Params
        const { leaveApplicationID } = request.params;

        if (leaveApplicationID === undefined)
            throw new UnauthorizedException("The leaveApplicationID cannot be undefined");

        for (const permission of allowedPermission) {
            
            // Xử lý quyền Quản lý duyệt đơn
            if (permission === 'manager') {
                const leaveApplication = await this.prismaService.leaveApplication.findFirst({
                    where: {
                        leaveApplicationID
                    }
                });


                if (leaveApplication === null)
                    throw new NotFoundException('Leave application is not found');

                const managerGet = await this.userService.getManagerIdOfUserID(leaveApplication.senderID);

                
                if (managerGet.statusCode !== OK_CODE || managerGet.data === undefined || managerGet.data.managerID === undefined)
                    throw new BadRequestException(managerGet.message);
                
                if (managerGet.data.managerID === currentUser.userID)
                    return true;
            }

            else if (permission === 'me') {
                 const leaveApplication = await this.prismaService.leaveApplication.findFirst({
                    where: {
                        leaveApplicationID
                    }
                });

                if (leaveApplication === null)
                    throw new NotFoundException('Leave application is not found');

                // Nếu User đang gọi API chính là người đã gửi đơn -> Pass
                if (currentUser.userID === leaveApplication.senderID)
                    return true;
            }
            
        }

        // Nếu không thỏa mãn bất kỳ quyền nào trong mảng allowedPermission
        throw new ForbiddenException("You don't have permission to access this leave application's data!");
    }
}
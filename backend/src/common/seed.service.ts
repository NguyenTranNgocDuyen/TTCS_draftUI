import { RoleService } from "src/role/role.service";
import { Injectable, OnModuleInit, Logger, ImATeapotException } from '@nestjs/common';

import { UserService } from "src/user/user.service";
import { nameRole_admin, nameRole_emloyee, OK_CODE, nameRole_noneRole } from "./code";
import { nameTypeLeave_AnnualLeave , nameTypeLeave_LeaveWithoutPermission, nameTypeLeave_LeaveWithPermission } from "./code";
import { TypeLeaveService } from "src/type-leave/type-leave.service";
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  constructor(
    private readonly roleService: RoleService,
    private readonly userService: UserService,
    private readonly typeleaveService : TypeLeaveService
  ) {}

  // Hàm này sẽ tự động chạy 1 lần khi App khởi động
  async onModuleInit() {
    await this.seedAdmin();
    await this.seedTypeLeave()
  }

  private async seedTypeLeave(){

    const typeLeave_AnnualLeaveGet = await this.typeleaveService.getTypeLeaveByName(nameTypeLeave_AnnualLeave)
    if (typeLeave_AnnualLeaveGet.statusCode !== OK_CODE)
    {
      const newTypeLeave_AnnualLeave = await this.typeleaveService.create({nameTypeLeave: nameTypeLeave_AnnualLeave , hasSalary :1 })
      this.logger.log(`create typeLeave ${nameTypeLeave_AnnualLeave}`)
    }
    else{
      this.logger.log(`typelave ${nameTypeLeave_AnnualLeave} is existed `)
    }

    const typeLeave_LeaveWithoutPermissionGet = await this.typeleaveService.getTypeLeaveByName(nameTypeLeave_LeaveWithoutPermission)
    if (typeLeave_LeaveWithoutPermissionGet.statusCode !== OK_CODE)
    {
      const newTypeLeave_LeaveWithoutPermission = await this.typeleaveService.create({nameTypeLeave: nameTypeLeave_LeaveWithoutPermission , hasSalary :0.7})
      this.logger.log(`create tye role ${nameTypeLeave_LeaveWithoutPermission}`)
    }
     else{
      this.logger.log(`typelave ${nameTypeLeave_LeaveWithoutPermission} is existed `)
    }
  

    const typeLeave_LeaveWithPermissionGet = await this.typeleaveService.getTypeLeaveByName(nameTypeLeave_LeaveWithPermission)
    if (typeLeave_LeaveWithPermissionGet.statusCode !== OK_CODE)
    {
      const newTypeLeave_LeaveWithPermission = await this.typeleaveService.create({nameTypeLeave: nameTypeLeave_LeaveWithPermission , hasSalary :0.7})
      this.logger.log(`create tye role ${nameTypeLeave_LeaveWithPermission}`)
    }
     else{
      this.logger.log(`typelave ${nameTypeLeave_LeaveWithPermission} is existed `)
    }
  }

  private async seedAdmin() {
    // 1. Kiểm tra xem role Admin đã tồn tại chưa
    const adminRole = await this.roleService.getRoleByRoleName(nameRole_admin);
    
    if (adminRole.statusCode !== OK_CODE) {
      this.logger.log('Đang khởi tạo Role Admin mặc định...');
      // Tạo role admin
      const newAdminRole = await this.roleService.create({nameRole :nameRole_admin});
      
      // 2. Kiểm tra và tạo User Admin đầu tiên (nếu chưa có)
      const adminUser = await this.userService.getUserByEmail('admin@gmail.com');
      if (adminUser.statusCode !== OK_CODE) {
        this.logger.log('Đang khởi tạo Tài khoản Admin mặc định...');
        await this.userService.createUser({
          email: 'admin@gmail.com',
          password: '123123', // Nhớ băm (hash) password trong hàm create nhé
          roleName: newAdminRole.data?.nameRole,
          username :'admin'
        });
      }
    } else {
      this.logger.log('Role Admin đã tồn tại, bỏ qua Seeding.');
    }


     const noneRole = await this.roleService.getRoleByRoleName(nameRole_noneRole);
    
    if (noneRole.statusCode !== OK_CODE) {
      this.logger.log('Đang khởi tạo Role Admin mặc định...');
      // Tạo role admin
      const newnoneRole = await this.roleService.create({nameRole : nameRole_noneRole});
      
    } else {
      this.logger.log('Role Admin đã tồn tại, bỏ qua Seeding.');
    }


     const EmployeeRole = await this.roleService.getRoleByRoleName(nameRole_emloyee);
    
    if (EmployeeRole.statusCode !== OK_CODE) {
      this.logger.log('Đang khởi tạo Role Admin mặc định...');
      // Tạo role admin
      const newEmployeeRole = await this.roleService.create({nameRole : nameRole_emloyee});
      

    } else {
      this.logger.log('Role Admin đã tồn tại, bỏ qua Seeding.');
    }
  }
}
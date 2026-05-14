import { forwardRef, Module } from '@nestjs/common';
import { TypeLeaveService } from './type-leave.service';
import { TypeLeaveController } from './type-leave.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  controllers: [TypeLeaveController],
  providers: [TypeLeaveService],
  imports :[forwardRef(() => UserModule)],
  exports : [TypeLeaveService]
})
export class TypeLeaveModule {}

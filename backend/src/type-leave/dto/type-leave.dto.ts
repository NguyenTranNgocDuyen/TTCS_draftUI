import { ApiProperty } from '@nestjs/swagger';

export class TypeLeaveDto {
  @ApiProperty({ description: 'ID của loại ngày nghỉ', format: 'uuid' })
  typeLeaveID: string;

  @ApiProperty({ description: 'Tên loại ngày nghỉ' })
  nameTypeLeave: string;

  @ApiProperty({ description: 'Hệ số/Số tiền hưởng lương khi nghỉ' })
  hasSalary: number;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTypeLeaveDto {
  @ApiProperty({
    description: 'Tên của loại ngày nghỉ (VD: Nghỉ ốm, Nghỉ phép năm)',
    example: 'Nghỉ phép năm'
  })
  @IsNotEmpty()
  @IsString()
  nameTypeLeave: string;

  @ApiProperty({
    description: 'Hệ số hoặc số tiền lương được hưởng (VD: 1.0 là 100% lương, 0.5 là 50%)',
    example: 1.0
  })
  @IsNotEmpty()
  @IsNumber()
  hasSalary: number;
}
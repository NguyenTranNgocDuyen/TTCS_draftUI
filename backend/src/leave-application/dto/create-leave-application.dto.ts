import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export default class CreateLeaveApplicationDto {
  @ApiProperty()
  @IsUUID('4', { message: 'typeLeaveID must be a UUID' })
  @IsNotEmpty()
  typeLeaveID: string;

  @ApiProperty({ type: Date, description: 'Format: YYYY-MM-DDTHH:mm:ssZ' })
  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid Date instance' })
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ type: Date, description: 'Format: YYYY-MM-DDTHH:mm:ssZ' })
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid Date instance' })
  @IsNotEmpty()
  endDate: Date;


  @ApiProperty()
  @IsNumber()
  @Min(0.5)
  @IsNotEmpty()
  duration: number;
  
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
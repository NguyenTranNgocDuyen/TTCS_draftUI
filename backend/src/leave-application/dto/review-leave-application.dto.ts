import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export default class ReviewLeaveApplicationDto {
  @ApiProperty({ description: 'True to approve, False to reject' })
  @IsBoolean()
  @IsNotEmpty()
  accept: boolean;

  @ApiPropertyOptional({ description: 'Required if accept is false' })
  @ValidateIf((o) => o.accept === false)
  @IsString()
  @IsNotEmpty({ message: 'reasonReject is required when rejecting' })
  reasonReject?: string;
}
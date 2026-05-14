import { Injectable } from '@nestjs/common';
import { CreateTypeLeaveDto } from './dto/create-type-leave.dto';
import { UpdateTypeLeaveDto } from './dto/update-type-leave.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, TypeLeave } from '@prisma/client';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import { ANOTHER_ERROR_RESPONE, BADREQUEST_CODE, CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE } from 'src/common/code';
import { TypeLeaveDto } from './dto/type-leave.dto';

@Injectable()
export class TypeLeaveService {
  constructor(private prismaService: PrismaService) { }

  async create(createTypeLeaveDto: CreateTypeLeaveDto ): Promise<ResponseDto<TypeLeaveDto>> {

    const { statusCode }: ResponseDto<TypeLeaveDto> = await this.getTypeLeaveByName(createTypeLeaveDto.nameTypeLeave);

    if (statusCode === OK_CODE) {
      return {
        statusCode: CONFLIG_CODE,
        message: `Name type leave existed`
      };
    }

    const typeLeave: TypeLeave = await this.prismaService.typeLeave.create({
      data: {
        nameTypeLeave: createTypeLeaveDto.nameTypeLeave,
        hasSalary: createTypeLeaveDto.hasSalary, 
      },
    });

    return {
      statusCode: CREATED_RESPONE,
      message: 'Created successfully',
      data: typeLeave
    };
  }

  async findAll(): Promise<ResponseDto<TypeLeaveDto[]>> {
    const typeLeaves: TypeLeaveDto[] | null = await this.prismaService.typeLeave.findMany();

    return {
      statusCode: OK_CODE,
      message: typeLeaves.length === 0 ? 'Hiện chưa có loại ngày nghỉ nào' : 'Lấy danh sách loại ngày nghỉ thành công',
      data: typeLeaves
    };
  }

  async findOne(typeLeaveID: string , tx?: Prisma.TransactionClient): Promise<ResponseDto<TypeLeaveDto>> {
    const db : Prisma.TransactionClient =tx ?? this.prismaService
    const typeLeave: TypeLeaveDto | null = await db.typeLeave.findUnique({
      where: { typeLeaveID }
    });

    if (!typeLeave) {
      return {
        statusCode: NOTFOUND_CODE,
        message: 'Type Leave id is not exist'
      };
    }

    return {
      statusCode: OK_CODE,
      message: `Get type leave id = ${typeLeaveID} successful`,
      data: typeLeave
    };
  }

  async update(id: string, updateTypeLeaveDto: UpdateTypeLeaveDto): Promise<ResponseDto<TypeLeaveDto> | AnotherError> {
    const findTypeLeaveByID: ResponseDto<TypeLeaveDto> = await this.findOne(id);
    
    if (findTypeLeaveByID.statusCode === NOTFOUND_CODE || findTypeLeaveByID.data === undefined) {
      return {
        statusCode: NOTFOUND_CODE,
        message: `Type Leave id is not exist`
      };
    }

    // Nếu tên muốn đổi trùng với tên đang có của record khác
    if (updateTypeLeaveDto.nameTypeLeave && findTypeLeaveByID.data.nameTypeLeave !== updateTypeLeaveDto.nameTypeLeave) {
      const findTypeLeaveByName: ResponseDto<TypeLeaveDto> = await this.getTypeLeaveByName(updateTypeLeaveDto.nameTypeLeave);
      if (findTypeLeaveByName.statusCode === OK_CODE) {
        return {
          statusCode: CONFLIG_CODE,
          message: `The type leave's name must be unique`
        };
      }
    }

    try {
      const newTypeLeave = await this.prismaService.typeLeave.update({
        where: { typeLeaveID: id },
        data: {
          nameTypeLeave: updateTypeLeaveDto.nameTypeLeave,
          hasSalary: updateTypeLeaveDto.hasSalary, // <-- Thêm update trường này
        }
      });
      return {
        statusCode: OK_CODE,
        message: `Update type leave having id = ${id} successful`,
        data: newTypeLeave
      };
    } catch (err) {
      return ANOTHER_ERROR_RESPONE;
    }
  }

  async remove(id: string): Promise<ResponseDto<TypeLeaveDto>> {
    try {
      // Kiểm tra xem có đơn xin nghỉ nào đang dùng TypeLeave này không (Dựa theo relation 'applications')
      // Bạn cần đảm bảo trường liên kết trong model LeaveApplication khớp với 'typeLeaveID'
      const applicationsCount = await this.prismaService.leaveApplication.count({
        where: { typeLeaveID: id } 
      });

      if (applicationsCount > 0) {
        return {
          statusCode: BADREQUEST_CODE, 
          message: 'Cannot delete type leave: There are leave applications associated with this type'
        };
      }

      await this.prismaService.typeLeave.delete({
        where: { typeLeaveID: id }
      });

      return {
        statusCode: OK_CODE,
        message: `Delete type leave with id = ${id} successfully`
      };

    } catch (error) {
      if (error.code === 'P2025') {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Type Leave ID does not exist'
        };
      }
      throw error;
    }
  }

  async getTypeLeaveByName(nameTypeLeave: string): Promise<ResponseDto<TypeLeaveDto>> {
    const typeLeave: TypeLeaveDto | null = await this.prismaService.typeLeave.findFirst({
      where: { nameTypeLeave }
    });

    if (!typeLeave) {
      return {
        statusCode: NOTFOUND_CODE,
        message: `The nameTypeLeave = ${nameTypeLeave} is not found`
      };
    }

    return {
      statusCode: OK_CODE,
      message: `Get type leave successful`,
      data: typeLeave
    };
  }
}
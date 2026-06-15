import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT
      parent.relname      AS parent,
      child.relname       AS child,
      pg_get_expr(child.relpartbound, child.oid) AS partition_expr
    FROM pg_inherits
      JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
      JOIN pg_class child  ON pg_inherits.inhrelid   = child.oid
    WHERE parent.relname = 'system_logs';
  `;
  
  if (Array.isArray(result) && result.length > 0) {
    console.log(`✅ Bảng system_logs ĐÃ được phân mảnh! Đang có ${result.length} phân mảnh (partitions).`);
    console.log('--- Danh sách 5 phân mảnh đầu tiên ---');
    console.table(result.slice(0, 5));
    if (result.length > 5) {
      console.log(`... và ${result.length - 5} phân mảnh khác.`);
    }
  } else {
    console.log('❌ Bảng system_logs CHƯA được phân mảnh hoặc không có phân mảnh nào được tạo.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

-- Rename the existing table and drop its constraints so we can reuse the names
ALTER TABLE "system_logs" RENAME TO "system_logs_old";
ALTER TABLE "system_logs_old" DROP CONSTRAINT "system_logs_pkey";
ALTER TABLE "system_logs_old" DROP CONSTRAINT "system_logs_userID_fkey";

-- Create the new partitioned table
CREATE TABLE "system_logs" (
  "logID" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityID" TEXT,
  "details" TEXT,
  "statusCode" INTEGER,
  "responseMessage" TEXT,
  "ipAddress" TEXT,
  "isAnomalous" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userID" TEXT,

  CONSTRAINT "system_logs_pkey" PRIMARY KEY ("logID", "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Add foreign key back
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_userID_fkey" FOREIGN KEY ("userID") REFERENCES "users"("userID") ON DELETE SET NULL ON UPDATE CASCADE;

-- Auto-generate monthly partitions for 10 years (2024 - 2033)
DO $$
DECLARE
    start_date DATE := '2024-01-01';
    end_date DATE;
    table_name TEXT;
BEGIN
    FOR i IN 0..120 LOOP
        end_date := start_date + INTERVAL '1 month';
        table_name := 'system_logs_y' || to_char(start_date, 'YYYY') || 'm' || to_char(start_date, 'MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF "system_logs" FOR VALUES FROM (%L) TO (%L)',
            table_name,
            start_date,
            end_date
        );
        start_date := end_date;
    END LOOP;
END $$;

-- Migrate data from old table to partitioned table
INSERT INTO "system_logs" ("logID", "action", "entity", "entityID", "details", "statusCode", "responseMessage", "ipAddress", "isAnomalous", "createdAt", "userID")
SELECT "logID", "action", "entity", "entityID", "details", "statusCode", "responseMessage", "ipAddress", "isAnomalous", "createdAt", "userID" FROM "system_logs_old";
-- Drop old table
DROP TABLE "system_logs_old";

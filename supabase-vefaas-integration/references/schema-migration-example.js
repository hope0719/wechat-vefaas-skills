/**
 * Supabase/PostgreSQL Schema 迁移脚本完整示例
 * 
 * 本文件提供数据库 schema 迁移的完整示例，包括：
 * - 添加列（幂等）
 * - 修改约束（先删后建）
 * - 添加唯一约束（幂等）
 * - 打印表结构（调试）
 * - 打印约束（调试）
 * 
 * 使用方法：
 *   node references/schema-migration-example.js
 */

const { Client } = require('pg');

// ============================================================
// 数据库连接配置
// ============================================================

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:PASSWORD@HOST:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

// ============================================================
// 迁移函数
// ============================================================

async function migrate() {
  await client.connect();
  console.log('=== 连接成功，开始迁移 ===\n');

  try {
    // ========== 1. 添加列（幂等） ==========
    console.log('[1/X] 添加列...');
    
    // 语法：ALTER TABLE table ADD COLUMN IF NOT EXISTS column_name data_type DEFAULT default_value;
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_logged_in boolean DEFAULT false;');
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS union_id text DEFAULT '';");
    await client.query("ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS title text DEFAULT '';");
    await client.query("ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS reason text DEFAULT '';");
    await client.query('ALTER TABLE tokens ADD COLUMN IF NOT EXISTS created_at bigint;');
    await client.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS shared_word jsonb;');
    await client.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS word text;');
    
    // ========== 2. 修改 CHECK 约束（先删后建） ==========
    console.log('[2/X] 修改约束...');
    
    // 错误方式：直接 ADD CONSTRAINT（如果已存在会报错）
    // 正确方式：先 DROP（IF EXISTS），再 ADD
    
    await client.query('ALTER TABLE points_transactions DROP CONSTRAINT IF EXISTS points_transactions_type_check;');
    await client.query(`
      ALTER TABLE points_transactions 
      ADD CONSTRAINT points_transactions_type_check 
      CHECK (type IN ('income', 'expense', 'in', 'out'));
    `);
    
    // ========== 3. 添加唯一约束（幂等，用 DO $$ 块） ==========
    console.log('[3/X] 添加唯一约束...');
    
    // Upsert 需要 onConflict 列有唯一约束
    // 用 DO $$ 块实现幂等（只有约束不存在时才创建）
    
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'checkins_user_id_key'
          AND conrelid = 'checkins'::regclass
        ) THEN
          ALTER TABLE checkins ADD CONSTRAINT checkins_user_id_key UNIQUE (user_id);
        END IF;
      END $$;
    `);
    
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'game_states_user_id_key'
          AND conrelid = 'game_states'::regclass
        ) THEN
          ALTER TABLE game_states ADD CONSTRAINT game_states_user_id_key UNIQUE (user_id);
        END IF;
      END $$;
    `);
    
    // ========== 4. 创建索引（可选，提升查询性能） ==========
    console.log('[4/X] 创建索引...');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_open_id ON users(open_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON points_transactions(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tokens_token ON tokens(token);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);');
    
    // ========== 5. 打印最终表结构（验证） ==========
    console.log('[5/X] 打印最终表结构...\n');
    
    const tables = ['users', 'invite_codes', 'tokens', 'points_transactions', 'checkins', 'rooms', 'game_states'];
    
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      console.log(`\n=== ${table} ===`);
      res.rows.forEach(row => {
        console.log(`  ${row.column_name} (${row.data_type}, nullable=${row.is_nullable})`);
      });
    }
    
    // ========== 6. 打印约束（验证） ==========
    console.log('\n=== 约束 ===');
    
    const constraints = await client.query(`
      SELECT 
        conname AS constraint_name,
        conrelid::regclass AS table_name,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint 
      WHERE contype IN ('c', 'u', 'p')  -- c=CHECK, u=UNIQUE, p=PRIMARY KEY
      AND conrelid IN (
        SELECT oid FROM pg_class 
        WHERE relname IN ('users', 'points_transactions', 'checkins', 'game_states')
      )
      ORDER BY conrelid::regclass::text, conname;
    `);
    
    constraints.rows.forEach(row => {
      console.log(`  ${row.table_name}: ${row.constraint_name} = ${row.definition}`);
    });
    
    console.log('\n=== 迁移完成 ===');
  } catch (e) {
    console.error('迁移失败:', e.message);
    throw e;
  } finally {
    await client.end();
  }
}

// ============================================================
// 执行
// ============================================================

migrate().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});

// ============================================================
// 常用 SQL 片段参考
// ============================================================

/*
-- 添加列
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name data_type DEFAULT default_value;

-- 修改列类型
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_data_type USING column_name::new_data_type;

-- 添加 CHECK 约束
ALTER TABLE table_name DROP CONSTRAINT IF EXISTS constraint_name;
ALTER TABLE table_name ADD CONSTRAINT constraint_name CHECK (condition);

-- 添加唯一约束（幂等）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'constraint_name') THEN
    ALTER TABLE table_name ADD CONSTRAINT constraint_name UNIQUE (column_name);
  END IF;
END $$;

-- 添加外键约束
ALTER TABLE table_name DROP CONSTRAINT IF EXISTS fk_name;
ALTER TABLE table_name ADD CONSTRAINT fk_name FOREIGN KEY (column_name) REFERENCES other_table(other_column);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name);
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column1, column2);  -- 复合索引
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column_name) WHERE condition;  -- 部分索引

-- 删除列
ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;

-- 重命名列
ALTER TABLE table_name RENAME COLUMN old_name TO new_name;

-- 查看表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'table_name'
ORDER BY ordinal_position;

-- 查看约束
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'table_name'::regclass;

-- 查看索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'table_name';
*/

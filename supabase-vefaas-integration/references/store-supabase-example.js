/**
 * Supabase 数据层完整示例
 * 本文件提供一个完整的数据层实现示例，包括：
 * - Supabase 客户端初始化（Node.js 20 兼容）
 * - 字段映射函数（snake_case ↔ camelCase）
 * - 所有 CRUD 操作示例
 * - 错误处理模式
 * - Upsert 模式
 * 
 * 使用方法：参考本文件的模式和约定，应用到实际项目中
 */

const { createClient } = require('@supabase/supabase-js');

// ============================================================
// 1. Supabase 客户端初始化（Node.js 20 兼容）
// ============================================================

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('缺少 Supabase 环境变量：SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }
    
    // Node.js 20 需要 ws 包提供 WebSocket 支持
    const ws = require('ws');
    
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: ws,
      },
    });
  }
  return supabase;
}

// ============================================================
// 2. 字段映射函数（snake_case → camelCase）
// ============================================================

function mapUser(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    openId: row.open_id,
    unionId: row.union_id || '',
    nickname: row.nickname || '',
    avatar: row.avatar || '',
    isLoggedIn: row.is_logged_in || false,
    points: row.points || 0,
    pointsIncomeMonth: row.points_income_month || 0,
    pointsExpenseMonth: row.points_expense_month || 0,
    checkinStreak: row.checkin_streak || 0,
    lastCheckinDate: row.last_checkin_date || null,
    inviteCode: row.invite_code || '',
    invitedBy: row.invited_by || null,
    inviteRewardReceived: row.invite_reward_received || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title || row.reason || '',
    reason: row.reason || row.title || '',
    amount: row.amount,
    balance: row.balance,
    createdAt: row.created_at,
  };
}

// ============================================================
// 3. CRUD 操作示例
// ============================================================

// --- 读取（Read） ---

async function getUser(userId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;  // 无记录
    throw error;
  }
  
  return mapUser(data);
}

async function getUserByOpenId(openId) {
  const client = getSupabase();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('open_id', openId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return mapUser(data);
}

async function getTransactions(userId, limit = 50) {
  const client = getSupabase();
  const { data, error } = await client
    .from('points_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));
  
  if (error) throw error;
  
  return (data || []).map(mapTransaction);
}

// --- 创建（Create） ---

async function createUser(user) {
  const client = getSupabase();
  
  const { data, error } = await client
    .from('users')
    .insert({
      user_id: user.userId,
      open_id: user.openId,
      union_id: user.unionId || '',
      nickname: user.nickname || '默认昵称',
      avatar: user.avatar || '',
      is_logged_in: user.isLoggedIn || true,
      points: user.points || 0,
      points_income_month: user.pointsIncomeMonth || 0,
      points_expense_month: user.pointsExpenseMonth || 0,
      checkin_streak: user.checkinStreak || 0,
      last_checkin_date: user.lastCheckinDate || null,
      invite_code: user.inviteCode || null,
      invited_by: user.invitedBy || null,
      invite_reward_received: user.inviteRewardReceived || false,
      created_at: user.createdAt || Date.now(),
      updated_at: user.updatedAt || Date.now(),
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return mapUser(data);
}

// --- 更新（Update） ---

async function updateUser(userId, updates) {
  const client = getSupabase();
  
  // 手动映射字段名（camelCase → snake_case）
  const dbUpdates = {};
  if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname;
  if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
  if (updates.isLoggedIn !== undefined) dbUpdates.is_logged_in = updates.isLoggedIn;
  if (updates.points !== undefined) dbUpdates.points = updates.points;
  if (updates.pointsIncomeMonth !== undefined) dbUpdates.points_income_month = updates.pointsIncomeMonth;
  if (updates.pointsExpenseMonth !== undefined) dbUpdates.points_expense_month = updates.pointsExpenseMonth;
  if (updates.checkinStreak !== undefined) dbUpdates.checkin_streak = updates.checkinStreak;
  if (updates.lastCheckinDate !== undefined) dbUpdates.last_checkin_date = updates.lastCheckinDate;
  if (updates.inviteCode !== undefined) dbUpdates.invite_code = updates.inviteCode;
  if (updates.invitedBy !== undefined) dbUpdates.invited_by = updates.invitedBy;
  if (updates.inviteRewardReceived !== undefined) dbUpdates.invite_reward_received = updates.inviteRewardReceived;
  
  dbUpdates.updated_at = Date.now();
  
  const { data, error } = await client
    .from('users')
    .update(dbUpdates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  return mapUser(data);
}

// --- 删除（Delete） ---

async function deleteToken(token) {
  const client = getSupabase();
  const { error } = await client
    .from('tokens')
    .delete()
    .eq('token', token);
  
  if (error) throw error;
}

// ============================================================
// 4. Upsert 模式（幂等写入）
// ============================================================

async function recordCheckin(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  
  const client = getSupabase();
  
  // 获取当前签到记录
  const { data: existing } = await client
    .from('checkins')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  // 计算连续签到天数
  let streak = 1;
  if (existing) {
    if (existing.last_date === yesterday) {
      streak = (existing.streak || 1) + 1;
    } else if (existing.last_date === today) {
      streak = existing.streak || 1;  // 今天已签到，保持
    } else {
      streak = 1;  // 中断，重置
    }
  }
  
  // Upsert（存在则更新，不存在则插入）
  const { error } = await client
    .from('checkins')
    .upsert({
      user_id: userId,
      last_date: today,
      streak: streak,
      updated_at: Date.now(),
    }, {
      onConflict: 'user_id',  // 依赖 user_id 的唯一约束
    });
  
  if (error) throw error;
  
  return streak;
}

// ============================================================
// 5. 事务操作（Transaction）
// ============================================================

// Supabase JS SDK 不支持事务，需要用 pg 库直接执行
const { Client } = require('pg');

async function transferPoints(fromUserId, toUserId, amount) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  
  await client.connect();
  
  try {
    await client.query('BEGIN');
    
    // 扣除发送方积分
    await client.query(
      'UPDATE users SET points = points - $1 WHERE user_id = $2',
      [amount, fromUserId]
    );
    
    // 增加接收方积分
    await client.query(
      'UPDATE users SET points = points + $1 WHERE user_id = $2',
      [amount, toUserId]
    );
    
    // 记录交易
    await client.query(
      'INSERT INTO points_transactions (user_id, type, amount, balance) VALUES ($1, $2, $3, (SELECT points FROM users WHERE user_id = $1))',
      [fromUserId, 'expense', amount]
    );
    
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

// ============================================================
// 6. 导出
// ============================================================

module.exports = {
  // 客户端初始化
  getSupabase,
  
  // Users
  getUser,
  getUserByOpenId,
  createUser,
  updateUser,
  
  // Transactions
  getTransactions,
  addTransaction,
  
  // Checkins
  recordCheckin,
  
  // 其他...
};

-- ============================================
-- 购物清单功能 - 迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================

-- 1. 购物清单表
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '个',
  category TEXT NOT NULL DEFAULT '其他',
  checked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_family ON shopping_lists(family_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_checked ON shopping_lists(checked);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- 2. RLS 策略：家庭范围 + 个人兼容
DROP POLICY IF EXISTS "Family or personal shopping access" ON shopping_lists;
CREATE POLICY "Family or personal shopping access"
  ON shopping_lists FOR ALL TO authenticated
  USING (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  )
  WITH CHECK (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  );

-- ============================================
-- 完成！
-- ============================================

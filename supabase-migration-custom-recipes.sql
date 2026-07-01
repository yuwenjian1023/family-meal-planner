-- ============================================
-- 自定义菜谱功能 - 迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================

-- 1. 自定义菜谱表
CREATE TABLE IF NOT EXISTS custom_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '家常菜',
  type TEXT NOT NULL DEFAULT '蔬菜',
  flavor TEXT NOT NULL DEFAULT '清淡',
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  prep_time INTEGER NOT NULL DEFAULT 10,
  cook_time INTEGER NOT NULL DEFAULT 20,
  difficulty TEXT NOT NULL DEFAULT '简单' CHECK (difficulty IN ('简单', '中等', '困难')),
  servings INTEGER NOT NULL DEFAULT 2,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_recipes_user ON custom_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_recipes_family ON custom_recipes(family_id);

ALTER TABLE custom_recipes ENABLE ROW LEVEL SECURITY;

-- 2. RLS 策略：家庭范围 + 个人兼容
DROP POLICY IF EXISTS "Family or personal custom recipes access" ON custom_recipes;
CREATE POLICY "Family or personal custom recipes access"
  ON custom_recipes FOR ALL TO authenticated
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

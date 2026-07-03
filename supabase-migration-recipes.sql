-- ============================================
-- 公共食谱表 - 存储从下厨房爬取的真实菜谱
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. 创建食谱表
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  flavor TEXT NOT NULL DEFAULT '',
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  prep_time INTEGER NOT NULL DEFAULT 10,
  cook_time INTEGER NOT NULL DEFAULT 15,
  difficulty TEXT NOT NULL DEFAULT '简单' CHECK (difficulty IN ('简单', '中等', '困难')),
  servings INTEGER NOT NULL DEFAULT 3,
  image_url TEXT,
  category_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_type ON recipes(type);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_category_id ON recipes(category_id);
CREATE INDEX IF NOT EXISTS idx_recipes_subcategory_id ON recipes(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);

-- RLS 策略：所有人可读，仅认证用户可管理
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- 允许所有人（包括匿名用户）读取
CREATE POLICY "Anyone can read recipes"
  ON recipes FOR SELECT
  USING (true);

-- 允许认证用户插入
CREATE POLICY "Authenticated users can insert recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允许认证用户更新
CREATE POLICY "Authenticated users can update recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (true);

-- 允许认证用户删除
CREATE POLICY "Authenticated users can delete recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 2. 食谱步骤表（支持图片）
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe ON recipe_steps(recipe_id, step_number);

-- RLS 策略
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read recipe steps"
  ON recipe_steps FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage recipe steps"
  ON recipe_steps FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- 3. 更新时间触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_recipes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_recipes_updated_at();

DROP TRIGGER IF EXISTS update_recipe_steps_updated_at ON recipe_steps;
CREATE TRIGGER update_recipe_steps_updated_at
  BEFORE UPDATE ON recipe_steps
  FOR EACH ROW EXECUTE FUNCTION update_recipes_updated_at();

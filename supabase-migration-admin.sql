-- ============================================
-- 食谱管理后台 - 数据库表结构
-- ============================================

-- ============================================
-- 1. 食谱分类表（支持多级分类）
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- 分类名称
  slug TEXT NOT NULL UNIQUE,            -- URL别名
  parent_id UUID REFERENCES recipe_categories(id) ON DELETE CASCADE,  -- 父分类ID（NULL表示一级分类）
  description TEXT,                        -- 分类描述
  icon TEXT,                              -- 分类图标
  sort_order INTEGER DEFAULT 0,           -- 排序
  is_active BOOLEAN DEFAULT true,       -- 是否启用
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_categories_parent ON recipe_categories(parent_id);
CREATE INDEX idx_categories_active ON recipe_categories(is_active);

-- ============================================
-- 2. 食谱步骤表（支持图片）
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,        -- 步骤序号
  description TEXT NOT NULL,              -- 步骤描述
  image_url TEXT,                        -- 步骤图片URL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX idx_steps_recipe ON recipe_steps(recipe_id);
CREATE INDEX idx_steps_order ON recipe_steps(recipe_id, step_number);

-- ============================================
-- 3. 扩展 recipes 表，增加字段
-- ============================================
DO $$
BEGIN
  -- 添加分类ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE recipes ADD COLUMN category_id UUID REFERENCES recipe_categories(id);
  END IF;

  -- 添加子分类ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'subcategory_id'
  ) THEN
    ALTER TABLE recipes ADD COLUMN subcategory_id UUID REFERENCES recipe_categories(id);
  END IF;

  -- 添加创建者邮箱
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'created_by_email'
  ) THEN
    ALTER TABLE recipes ADD COLUMN created_by_email TEXT;
  END IF;

  -- 添加是否发布
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE recipes ADD COLUMN is_published BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================
-- 4. 图片存储Bucket（用于上传食谱图片）
-- 注意：这部分需要在 Supabase Dashboard 手动创建
-- ============================================
-- Storage > Create Bucket > Name: recipe-images
-- 设置：Public = true
-- Policy：
-- CREATE POLICY "Public access" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-images');
-- CREATE POLICY "Admin can upload" ON storage.objects FOR INSERT WITH CHECK (
--   bucket_id = 'recipe-images' AND
--   auth.email() = '740225978@qq.com'
-- );
-- CREATE POLICY "Admin can update/delete" ON storage.objects FOR UPDATE USING (
--   bucket_id = 'recipe-images' AND
--   auth.email() = '740225978@qq.com'
-- );
-- CREATE POLICY "Admin can delete" ON storage.objects FOR DELETE USING (
--   bucket_id = 'recipe-images' AND
--   auth.email() = '740225978@qq.com'
-- );

-- ============================================
-- 5. RLS 策略 - 仅管理员可编辑
-- ============================================
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

-- 所有人可读取已发布的食谱
CREATE POLICY "Everyone can read published recipes"
  ON recipes FOR SELECT
  USING (is_published = true);

-- 管理员可读取所有食谱
CREATE POLICY "Admin can read all recipes"
  ON recipes FOR SELECT
  USING (auth.email() = '740225978@qq.com');

-- 管理员可插入/更新/删除食谱
CREATE POLICY "Admin can manage recipes"
  ON recipes FOR ALL
  USING (auth.email() = '740225978@qq.com');

-- 所有人可读取分类
CREATE POLICY "Everyone can read categories"
  ON recipe_categories FOR SELECT
  USING (is_active = true);

-- 管理员可管理分类
CREATE POLICY "Admin can manage categories"
  ON recipe_categories FOR ALL
  USING (auth.email() = '740225978@qq.com');

-- 所有人可读取步骤
CREATE POLICY "Everyone can read steps"
  ON recipe_steps FOR SELECT
  USING (true);

-- 管理员可管理步骤
CREATE POLICY "Admin can manage steps"
  ON recipe_steps FOR ALL
  USING (auth.email() = '740225978@qq.com');

-- ============================================
-- 6. 更新时间触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON recipe_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_steps_updated_at
  BEFORE UPDATE ON recipe_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 7. 示例数据 - 默认分类
-- ============================================
INSERT INTO recipe_categories (name, slug, description, sort_order) VALUES
  ('川菜', 'sichuan', '四川菜系，麻辣鲜香', 1),
  ('粤菜', 'cantonese', '广东菜系，清淡鲜美', 2),
  ('湘菜', 'hunan', '湖南菜系，酸辣可口', 3),
  ('家常菜', 'home-style', '日常家常菜', 4),
  ('汤类', 'soup', '营养汤品', 5),
  ('主食', 'main-food', '米饭面条等主食', 6)
ON CONFLICT (slug) DO NOTHING;

-- 二级分类示例
INSERT INTO recipe_categories (name, slug, parent_id, description, sort_order)
SELECT '热菜', 'sichuan-hot', id, '川菜热菜', 1
FROM recipe_categories WHERE slug = 'sichuan'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO recipe_categories (name, slug, parent_id, description, sort_order)
SELECT '凉菜', 'sichuan-cold', id, '川菜凉菜', 2
FROM recipe_categories WHERE slug = 'sichuan'
ON CONFLICT (slug) DO NOTHING;

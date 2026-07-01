-- ============================================
-- 家庭共享功能 - 迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================

-- 1. 家庭表
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON families(created_by);
CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- 2. 家庭成员表（必须在 is_family_member 函数之前创建）
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_family ON family_members(family_id);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- 3. 邀请码生成函数 (6位字母数字，排除易混淆字符)
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 4. 辅助函数：检查用户是否属于某家庭
CREATE OR REPLACE FUNCTION is_family_member(fid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = fid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. family_members RLS 策略

-- 家庭成员可查看同家庭的成员列表
CREATE POLICY "Members can view family members"
  ON family_members FOR SELECT TO authenticated
  USING (is_family_member(family_id));

-- 任何人可通过邀请码加入（由 RPC 函数处理）
CREATE POLICY "Authenticated users can join families"
  ON family_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM family_members
      WHERE family_id = family_members.family_id AND user_id = auth.uid()
    )
  );

-- 创建者或本人可删除（退出/踢出）
CREATE POLICY "Owner or self can delete membership"
  ON family_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM families
      WHERE id = family_members.family_id AND created_by = auth.uid()
    )
  );

-- 6. RPC：通过邀请码加入家庭
CREATE OR REPLACE FUNCTION join_family_by_code(invite_code_input TEXT)
RETURNS UUID AS $$
DECLARE
  fid UUID;
BEGIN
  SELECT id INTO fid FROM families WHERE UPPER(invite_code) = UPPER(invite_code_input);
  IF fid IS NULL THEN
    RAISE EXCEPTION '邀请码无效，请检查后重试';
  END IF;

  INSERT INTO family_members (family_id, user_id, role)
  VALUES (fid, auth.uid(), 'member')
  ON CONFLICT (family_id, user_id) DO NOTHING;

  RETURN fid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC：创建家庭并自动加入
CREATE OR REPLACE FUNCTION create_family_with_owner(family_name TEXT)
RETURNS JSONB AS $$
DECLARE
  new_family families;
  invite_cd TEXT;
BEGIN
  LOOP
    invite_cd := generate_invite_code();
    BEGIN
      INSERT INTO families (name, invite_code, created_by)
      VALUES (family_name, invite_cd, auth.uid())
      RETURNING * INTO new_family;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- 邀请码冲突，重试
    END;
  END LOOP;

  INSERT INTO family_members (family_id, user_id, role)
  VALUES (new_family.id, auth.uid(), 'owner');

  RETURN jsonb_build_object(
    'id', new_family.id,
    'name', new_family.name,
    'invite_code', new_family.invite_code,
    'created_by', new_family.created_by,
    'created_at', new_family.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC：获取用户的所有家庭
CREATE OR REPLACE FUNCTION get_user_families()
RETURNS TABLE(
  family_id UUID,
  family_name TEXT,
  invite_code TEXT,
  role TEXT,
  member_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id AS family_id,
    f.name AS family_name,
    f.invite_code,
    fm.role,
    (SELECT count(*) FROM family_members WHERE family_id = f.id) AS member_count,
    f.created_at
  FROM families f
  JOIN family_members fm ON f.id = fm.family_id
  WHERE fm.user_id = auth.uid()
  ORDER BY fm.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 给现有数据表添加 family_id
ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id);

-- 更新索引：加入 family_id 维度
CREATE INDEX IF NOT EXISTS idx_pantry_family ON pantry_items(family_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_family ON meal_plans(family_id);
CREATE INDEX IF NOT EXISTS idx_favorites_family ON favorites(family_id);

-- meal_plans 唯一约束调整：同一家庭同一天同一餐只能有一个
-- 先删除旧约束，再建新的
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS meal_plans_user_id_date_meal_type_key;
ALTER TABLE meal_plans ADD CONSTRAINT meal_plans_family_date_meal_key
  UNIQUE NULLS NOT DISTINCT (family_id, date, meal_type);

-- 8. 更新 RLS 策略：家庭范围 + 个人兼容
-- pantry_items
DROP POLICY IF EXISTS "Users can manage their own pantry items" ON pantry_items;
DROP POLICY IF EXISTS "Family-scoped pantry access" ON pantry_items;
CREATE POLICY "Family or personal pantry access"
  ON pantry_items FOR ALL TO authenticated
  USING (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  )
  WITH CHECK (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  );

-- meal_plans
DROP POLICY IF EXISTS "Users can manage their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Family-scoped meal plans access" ON meal_plans;
CREATE POLICY "Family or personal meal plans access"
  ON meal_plans FOR ALL TO authenticated
  USING (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  )
  WITH CHECK (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  );

-- favorites
DROP POLICY IF EXISTS "Users can manage their own favorites" ON favorites;
DROP POLICY IF EXISTS "Family-scoped favorites access" ON favorites;
CREATE POLICY "Family or personal favorites access"
  ON favorites FOR ALL TO authenticated
  USING (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  )
  WITH CHECK (
    (family_id IS NULL AND user_id = auth.uid())
    OR (family_id IS NOT NULL AND is_family_member(family_id))
  );

-- families 查看策略
CREATE POLICY "Members can read their families"
  ON families FOR SELECT TO authenticated
  USING (is_family_member(id));

CREATE POLICY "Owners can update families"
  ON families FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- 完成！现在可以在应用中创建和加入家庭了
-- ============================================

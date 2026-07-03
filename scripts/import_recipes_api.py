#!/usr/bin/env python3
"""
通过 Supabase REST API 批量导入食谱数据（直接写入，无需手动 SQL）
"""
import json
import os
import time
import re
import requests

SUPABASE_URL = "https://jndfjigymkrzfvxiyupn.supabase.co"
ANON_KEY = "sb_publishable_EVvDK5MyJpKQhGzQvmXrQw_HzPYk7DZ"

# 先建表 SQL（通过管理接口执行）
CREATE_TABLE_SQL = """
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
  difficulty TEXT NOT NULL DEFAULT '简单',
  servings INTEGER NOT NULL DEFAULT 3,
  image_url TEXT,
  category_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES recipe_categories(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert recipes" ON recipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update recipes" ON recipes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete recipes" ON recipes FOR DELETE TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_name ON recipes(name);
"""

# 先通过临时表的方式绕过 RLS
INSERT_SETUP = """
-- 临时允许 anon 插入（仅用于数据导入）
ALTER TABLE recipes DISABLE ROW LEVEL SECURITY;
"""

INSERT_CLEANUP = """
-- 恢复 RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
"""

def estimate_difficulty(steps_count):
    if steps_count <= 5: return '简单'
    elif steps_count <= 10: return '中等'
    else: return '困难'

def estimate_time(steps_count):
    prep = min(steps_count * 3, 30)
    cook = steps_count * 5
    return max(prep, 5), max(cook, 10)

def clean_name(name):
    # 移除 emoji
    name = re.sub(r'[\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F\u200D\U0001F900-\U0001F9FF\u2702-\u27B0\u24C2-\U0001F251]', '', name)
    name = re.sub(r'[「」【】《》""\'\'「]', '', name)
    return name.strip() or name


def import_data():
    # 1. 读取数据
    progress_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "output", "recipes_20260703_140129_progress.json"
    )
    if not os.path.exists(progress_path):
        print(f"错误: 未找到 {progress_path}")
        return

    with open(progress_path, "r", encoding="utf-8") as f:
        recipes = json.load(f)
    print(f"读取 {len(recipes)} 道食谱")

    # 2. 先去重
    seen = set()
    unique = []
    for r in recipes:
        url = r.get("source_url", "")
        if url and url in seen: continue
        seen.add(url)
        unique.append(r)
    print(f"去重后: {len(unique)} 道")

    # 3. 先创建表（需要服务端执行，我们直接 INSERT）
    # 由于 RLS 限制，先尝试用 REST API 插入
    headers = {
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }

    # 分批次插入（每批 5 条，避免太大）
    batch_size = 5
    success = 0
    failed = 0

    for i in range(0, len(unique), batch_size):
        batch = unique[i:i+batch_size]
        rows = []

        for recipe in batch:
            name = clean_name(recipe.get("name", ""))
            if not name: continue

            category = recipe.get("category", "")
            subcategory = recipe.get("subcategory", "")
            image_url = recipe.get("image_url", "")
            ingredients = recipe.get("ingredients", [])
            steps = recipe.get("steps", [])

            prep_time, cook_time = estimate_time(len(steps))
            difficulty = estimate_difficulty(len(steps))

            # 口味推断
            desc = recipe.get("description", "")
            flavor = ""
            if "辣" in name or "辣" in desc: flavor = "辣"
            elif "酸" in name: flavor = "酸"
            elif "甜" in name: flavor = "甜"

            rows.append({
                "name": name,
                "category": category,
                "type": subcategory,
                "flavor": flavor,
                "ingredients": ingredients,
                "steps": steps,
                "prep_time": prep_time,
                "cook_time": cook_time,
                "difficulty": difficulty,
                "servings": 3,
                "image_url": image_url,
                "is_published": True,
                "is_verified": True,
            })

        if not rows:
            continue

        try:
            # Supabase Bulk Insert via REST API
            url = f"{SUPABASE_URL}/rest/v1/recipes"
            resp = requests.post(
                url,
                headers={**headers, "Prefer": "return=minimal"},
                json=rows,
                timeout=30,
            )

            if resp.status_code in (200, 201):
                success += len(rows)
                print(f"  ✓ {i+1}-{min(i+len(rows), len(unique))}/{len(unique)} ({success} 成功)", flush=True)
            elif resp.status_code == 401:
                print(f"  ⚠️ 需要认证 - RLS 阻止了匿名插入。请先在 Supabase SQL Editor 执行 supabase-migration-recipes.sql")
                print(f"     然后执行 scripts/output/recipes_import.sql")
                failed += len(rows)
                break
            elif resp.status_code == 409:
                # 重复键，可能部分成功
                print(f"  ~ {i+1}-{i+len(rows)}/{len(unique)} (冲突)", flush=True)
            else:
                print(f"  ✗ {i+1}-{i+len(rows)}/{len(unique)} HTTP {resp.status_code}: {resp.text[:100]}")
                failed += len(rows)

        except Exception as e:
            print(f"  ✗ 网络错误: {e}")
            failed += len(rows)

        time.sleep(0.05)  # 极小延迟

    print(f"\n总计: {success} 成功, {failed} 失败")


if __name__ == "__main__":
    import_data()

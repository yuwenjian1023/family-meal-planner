#!/usr/bin/env python3
"""
将下厨房爬取的食谱 JSON 转换为 SQL INSERT 语句
用法: python3 import_recipes_to_sql.py [--input INPUT] [--output OUTPUT]
"""
import json
import os
import argparse
import re
import hashlib
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "output")

def estimate_difficulty(steps_count):
    """根据步骤数量估算难度"""
    if steps_count <= 5:
        return '简单'
    elif steps_count <= 10:
        return '中等'
    else:
        return '困难'

def estimate_time(steps_count):
    """根据步骤数估算烹饪时间"""
    prep = min(steps_count * 3, 30)  # 每步约3分钟准备
    cook = steps_count * 5  # 每步约5分钟烹饪
    return max(prep, 5), max(cook, 10)

def clean_name(name):
    """清理菜名中的特殊字符，保留中文和正常文字"""
    if not name:
        return name

    # 1) 藏文装饰符（下厨房常见）
    name = re.sub(r'[༄༅༆༇༈༉༊་༌།༎༏]', '', name)
    # 2) Emoji 范围（精确，不覆盖 CJK 中文/日文/韩文）
    #    U+1F300..U+1FAFF  = emoji 主区块
    #    U+2600..U+27BF    = Miscellaneous Symbols
    #    U+FE00..U+FE0F    = Variation Selectors
    #    U+200D            = Zero Width Joiner
    #    U+1F900..U+1F9FF  = Supplemental Symbols
    #    U+1FA00..U+1FA6F  = Chess / Symbols
    #    U+1FA70..U+1FAFF  = Symbols Extended-A
    #    U+2702..U+27B0    = Dingbats（精选，不包含 CJK）
    #    ⚠️ 禁止使用 \u24C2..\U0001F251 这个超大范围！它覆盖了全部中文字符
    name = re.sub(
        r'[\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F\u200D'
        r'\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F'
        r'\U0001FA70-\U0001FAFF\u2702-\u27B0]',
        '', name
    )
    # 3) 全角标点/括号类装饰
    name = re.sub(r'[「」『』【】《》〖〗〔〕""\'\'·]', '', name)
    # 4) 常见营销前缀后缀噪音
    name = re.sub(r'^(✅|✔️|❤️|💖|⭐|🔥|🌟)\s*', '', name)
    name = re.sub(r'[‼‼️‽⁉!!]+$', '', name)
    name = re.sub(r'^(挑战\d+天.*?不重样第?\d*天?)\s*:?\s*', '', name)
    # 5) 清理多余空白
    name = name.strip()
    # 6) 如果清理后为空或过短（<=1字符），标记为无效
    return name if len(name) >= 2 else None

def escape_sql_string(s):
    """转义 SQL 字符串"""
    if s is None:
        return 'NULL'
    s = str(s)
    s = s.replace('\\', '\\\\')
    s = s.replace("'", "''")
    return f"'{s}'"

def generate_sql(recipes):
    """生成 SQL INSERT 语句"""
    lines = []
    lines.append("-- ============================================")
    lines.append(f"-- 下厨房食谱数据导入 ({len(recipes)} 道)")
    lines.append(f"-- 生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("-- 在 Supabase SQL Editor 中执行")
    lines.append("-- ============================================")
    lines.append("")
    lines.append("-- 先清空现有数据（可选，如需保留请跳过）")
    lines.append("-- DELETE FROM recipes WHERE is_verified = true;")
    lines.append("")

    for i, recipe in enumerate(recipes):
        try:
            name = recipe.get("name", "")
            category = recipe.get("category", "")
            subcategory = recipe.get("subcategory", "")
            description = recipe.get("description", "")
            ingredients = recipe.get("ingredients", [])
            steps = recipe.get("steps", [])
            image_url = recipe.get("image_url", "")
            source_url = recipe.get("source_url", "")

            # 清理菜名
            clean = clean_name(name)
            if not clean:
                continue

            # 估算时间和难度
            prep_time, cook_time = estimate_time(len(steps))
            difficulty = estimate_difficulty(len(steps))

            # JSON 序列化
            ing_json = json.dumps(ingredients, ensure_ascii=False)
            step_json = json.dumps(steps, ensure_ascii=False)

            # 第2步作为简介（如果 description 为空）
            if not description and len(steps) > 1:
                description = steps[1][:80] if steps else ""

            # 口味推断
            flavor = ""
            if "辣" in name or "辣" in description:
                flavor = "辣"
            elif "酸" in name:
                flavor = "酸"
            elif "甜" in name:
                flavor = "甜"

            sql = (
                f"INSERT INTO recipes "
                f"(name, category, type, flavor, ingredients, steps, prep_time, cook_time, "
                f"difficulty, servings, image_url, is_published, is_verified) "
                f"VALUES ("
                f"{escape_sql_string(clean)}, "
                f"{escape_sql_string(category)}, "
                f"{escape_sql_string(subcategory)}, "
                f"{escape_sql_string(flavor)}, "
                f"'{ing_json}'::jsonb, "
                f"'{step_json}'::jsonb, "
                f"{prep_time}, "
                f"{cook_time}, "
                f"{escape_sql_string(difficulty)}, "
                f"3, "
                f"{escape_sql_string(image_url)}, "
                f"true, "
                f"true"
                f");"
            )
            lines.append(sql)
            lines.append("")

        except Exception as e:
            print(f"  警告: 第 {i+1} 道菜处理失败 ({recipe.get('name','?')[:20]}): {e}")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="将爬取的食谱 JSON 转换为 SQL INSERT 文件")
    parser.add_argument("--input", type=str, help="输入 JSON 文件路径")
    parser.add_argument("--output", type=str, help="输出 SQL 文件路径")
    args = parser.parse_args()

    # 查找输入文件
    if args.input:
        input_path = args.input
    else:
        # 查找最新的 progress 文件
        progress_files = []
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith("_progress.json") or f.startswith("recipes_20") and f.endswith(".json"):
                fpath = os.path.join(OUTPUT_DIR, f)
                progress_files.append((os.path.getmtime(fpath), fpath))
        if not progress_files:
            print("错误: 未找到 scraped JSON 文件")
            return
        progress_files.sort(reverse=True)
        input_path = progress_files[0][1]
        print(f"使用: {input_path}")

    # 读取数据
    with open(input_path, "r", encoding="utf-8") as f:
        recipes = json.load(f)
    print(f"读取 {len(recipes)} 道食谱")

    # 统计分类
    cats = {}
    for r in recipes:
        c = r.get("category", "未知")
        cats[c] = cats.get(c, 0) + 1
    print("分类分布:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n} 道")

    # 去重（按 source_url）
    seen = set()
    unique = []
    for r in recipes:
        url = r.get("source_url", "")
        if url and url in seen:
            continue
        seen.add(url)
        unique.append(r)
    dups = len(recipes) - len(unique)
    if dups > 0:
        print(f"去除 {dups} 条重复，剩余 {len(unique)} 道")

    # 生成 SQL
    print("生成 SQL...")
    sql = generate_sql(unique)

    # 输出
    if args.output:
        output_path = args.output
    else:
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(OUTPUT_DIR, f"recipes_import_{timestamp}.sql")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"\n完成! SQL 文件: {output_path}")
    print(f"文件大小: {os.path.getsize(output_path) / 1024:.1f} KB")
    print(f"\n请在 Supabase SQL Editor 中执行以下两个文件:")
    print(f"  1. supabase-migration-recipes.sql (建表)")
    print(f"  2. {os.path.basename(output_path)} (导入数据)")


if __name__ == "__main__":
    main()

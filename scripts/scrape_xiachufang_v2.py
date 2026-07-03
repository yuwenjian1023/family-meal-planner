#!/usr/bin/env python3
"""
下厨房菜谱爬虫 v2
- 基于用户提供的参考代码，使用 cookies + lxml etree 解析
- 流程: 分类页 → 菜谱列表页 → 菜谱详情页
- 输出: JSON + SQL 文件

用法:
  python3 scrape_xiachufang_v2.py [--limit 100] [--delay 2] [--pages 3]

依赖:
  pip install requests lxml
"""

import requests
from lxml import etree
import json
import re
import time
import sys
import os
import argparse
import random
from urllib.parse import urljoin

BASE_URL = "https://www.xiachufang.com"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ===== Cookies（从用户浏览器复制，关键的是 xcf_clearance） =====
COOKIES = {
    "sensorsdata2015jssdkcross": "%7B%22distinct_id%22%3A%2219f1b961fdb81c-08996f6cf763d68-16525631-1930176-19f1b961fdc1558%22%2C%22%24device_id%22%3A%2219f1b961fdb81c-08996f6cf763d68-16525631-1930176-19f1b961fdc1558%22%2C%22props%22%3A%7B%22%24latest_referrer%22%3A%22https%3A%2F%2Fwww.google.com.hk%2F%22%2C%22%24latest_referrer_host%22%3A%22www.google.com.hk%22%2C%22%24latest_traffic_source_type%22%3A%22%E8%87%AA%E7%84%B6%E6%90%9C%E7%B4%A2%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC%22%7D%7D",
    "_ga": "GA1.2.1521146819.1782874251",
    "bid": "1JPNLx4N",
    "_c_WBKFRo": "Gzmmpv9AhmWIvCRkZ9gKBnlXjrGvVdNv2QkLFDPV",
    "_nb_ioWEgULi": "",
    "xcf_clearance": "A7yjUWN/UaoKB4g8YHpb5GOcBHQ/TJ8hPJWa3h4q90gxag9Ryu0ASWuFxNJxs4qXJvMjdxNLb94zI1+fa0l0kqTVSPO1AEbDmFTZGhH0xB9bzkaS92O4Xugcf7VK7ogxoZdq87wzfDCqdIkKG38T2PA/BrFsWmqg7iG/VCBLvsfYVDveEG6QLkoJSpwcH+FvTfx+3qMaNQXMZUvAVW5yeHCj7ZnSZlc9csydBJDqINM=",
}

# ===== 请求头（模拟真实浏览器） =====
HEADERS = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "zh-CN,zh;q=0.9",
    "cache-control": "max-age=0",
    "priority": "u=0, i",
    "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
}

session = requests.Session()
session.headers.update(HEADERS)
session.cookies.update(COOKIES)


def fetch_page(url, retries=3, delay=3):
    """获取页面 HTML，带重试"""
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=20)
            if resp.status_code == 200:
                # 检查是否被限流
                if "访问频率太高" in resp.text or "滑动验证" in resp.text:
                    wait = delay * (2 ** attempt) + random.uniform(1, 3)
                    print(f"  ⏳ 被限流，等待 {wait:.0f}s...", flush=True)
                    time.sleep(wait)
                    continue
                return resp
            elif resp.status_code == 429:
                wait = delay * (3 ** attempt) + random.uniform(2, 5)
                print(f"  ⏳ 429 限流，等待 {wait:.0f}s...", flush=True)
                time.sleep(wait)
            else:
                print(f"  ⚠️ HTTP {resp.status_code}", flush=True)
                time.sleep(delay)
        except Exception as e:
            print(f"  ⚠️ Error: {e}", flush=True)
            time.sleep(delay * 2)
    return None


def parse_html(html_text):
    """用 lxml 解析 HTML"""
    return etree.HTML(html_text)


# ===== 第1步: 获取所有分类 =====
def get_all_categories():
    """
    从 /category/ 页面获取所有一级和二级分类
    返回: [{name: "肉类", children: [{name: "猪肉", url: "/category/40076/"}, ...]}, ...]
    """
    print("📋 正在获取分类列表...")
    resp = fetch_page(f"{BASE_URL}/category/")
    if not resp:
        print("❌ 无法获取分类页面")
        return []

    tree = parse_html(resp.text)

    # 一级分类标题
    one_category_list = tree.xpath('//h3[@class="font20 m0"]/text()')
    print(f"  → 找到 {len(one_category_list)} 个一级分类")

    categories = []
    for i in range(len(one_category_list)):
        one_name = one_category_list[i].strip()
        # 二级分类名和URL
        two_names = tree.xpath(f'/html/body/div[3]/div/div/div/div[{i+1}]/div[3]/ul/li/a/text()')
        two_urls = tree.xpath(f'/html/body/div[3]/div/div/div/div[{i+1}]/div[3]/ul/li/a/@href')

        children = []
        for name, url in zip(two_names, two_urls):
            children.append({
                "name": name.strip(),
                "url": url if url.startswith("http") else BASE_URL + url,
            })

        categories.append({
            "name": one_name,
            "children": children,
        })
        print(f"  → {one_name}: {len(children)} 个二级分类")

    return categories


# ===== 第2步: 从分类页获取菜谱链接 =====
def get_recipe_urls_from_category(category_url, pages=2):
    """
    从分类页面获取菜谱链接
    如: https://www.xiachufang.com/category/40076/?page=1
    """
    urls = set()
    for page in range(1, pages + 1):
        url = f"{category_url}?page={page}" if "?" not in category_url else f"{category_url}&page={page}"
        if page == 1:
            url = category_url  # 第一页不需要 page 参数

        print(f"  📄 扫描: {url}")
        resp = fetch_page(url)
        if not resp:
            continue

        tree = parse_html(resp.text)

        # 方法1: 用用户提供的 XPath
        links = tree.xpath('/html/body/div[3]/div/div/div[1]/div[1]/div/div[2]/div[2]/ul/li/div/a/@href')
        if not links:
            # 方法2: 通用 XPath 匹配所有 /recipe/数字/ 链接
            links = tree.xpath('//a[contains(@href, "/recipe/") and contains(@href, "/recipe/")]/@href')

        # 过滤出有效的菜谱链接: /recipe/数字/ 格式
        recipe_links = []
        for l in links:
            m = re.search(r'/recipe/(\d+)/?', l)
            if m:
                clean_url = f"{BASE_URL}/recipe/{m.group(1)}/"
                recipe_links.append(clean_url)

        for link in recipe_links:
            urls.add(link)

        print(f"    → 累计 {len(urls)} 个菜谱链接")

        if page < pages:
            time.sleep(random.uniform(0.5, 1.5))

    return sorted(urls)


# ===== 第3步: 解析菜谱详情页 =====
def parse_ingredient(ing_text):
    """解析食材字符串如 '250克猪瘦肉' -> {name: '猪瘦肉', amount: '250克'}"""
    text = ing_text.strip()
    match = re.match(r'^([\d.]+\s*(?:克|g|kg|斤|两|个|只|条|片|块|段|根|把|勺|大勺|小勺|汤匙|茶匙|杯|ml|L|升|滴|少许|适量|半))\s*(.*)', text)
    if match:
        amount = match.group(1).strip()
        name = match.group(2).strip()
        if name:
            return {"name": name, "amount": amount}
    return {"name": text, "amount": "适量"}


def parse_recipe_detail(html_text, url):
    """解析菜谱详情页：优先从 JSON-LD 提取，回退到 XPath"""
    # ---- 方法1: JSON-LD 结构化数据（最可靠） ----
    ld_match = re.search(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html_text, re.DOTALL
    )
    if ld_match:
        try:
            ld = json.loads(ld_match.group(1))
            if isinstance(ld, list):
                ld = ld[0] if ld else {}

            if ld.get("@type") == "Recipe" or "recipeIngredient" in ld:
                name = ld.get("name", "").strip()

                # 食材
                ingredients_raw = ld.get("recipeIngredient", [])
                ingredients = [parse_ingredient(ing) for ing in ingredients_raw]

                # 步骤 - 可能是字符串或列表
                instructions = ld.get("recipeInstructions", "")
                steps = []
                if isinstance(instructions, str):
                    # "1.xxx 2.xxx 3.xxx" -> 按编号分割
                    step_list = re.split(r'\d+\.', instructions)
                    steps = [s.strip() for s in step_list if s.strip() and len(s.strip()) > 3]
                elif isinstance(instructions, list):
                    for s in instructions:
                        txt = s.get("text", str(s)) if isinstance(s, dict) else str(s)
                        txt = txt.strip()
                        if txt:
                            steps.append(txt)

                # 图片
                image = ld.get("image", "")
                if isinstance(image, list):
                    image = image[0] if image else ""
                # 去掉图片URL中的缩放参数，取原图
                if image and "imageView2" in image:
                    image = image.split("?")[0]

                # 描述
                description = ld.get("description", "").strip()

                # 如果步骤为空，用 p.text 回退
                if not steps:
                    tree = parse_html(html_text)
                    step_texts = tree.xpath('//p[@class="text"]/text()')
                    steps = [s.strip() for s in step_texts if s.strip() and len(s.strip()) > 3]

                if name and ingredients and steps:
                    return {
                        "name": name,
                        "description": description,
                        "ingredients": ingredients,
                        "steps": steps,
                        "image_url": image,
                        "source_url": url,
                    }
        except (json.JSONDecodeError, KeyError, IndexError):
            pass

    # ---- 方法2: XPath 回退解析 ----
    tree = parse_html(html_text)

    # 菜名
    name_list = tree.xpath('//h1[@class="page-title"]/text()')
    name = name_list[0].strip() if name_list else ""
    if not name:
        name_list = tree.xpath('//h1/text()')
        name = name_list[0].strip() if name_list else ""

    # 食材
    ingredients = []
    ing_rows = tree.xpath('//tr[itemprop="recipeIngredient"]')
    if ing_rows:
        for row in ing_rows:
            tds = row.xpath('.//td')
            if len(tds) >= 2:
                ing_name = tds[0].text.strip() if tds[0].text else ""
                ing_unit = tds[1].text.strip() if tds[1].text else "适量"
                if ing_name:
                    ingredients.append({"name": ing_name, "amount": ing_unit})

    # 步骤 - p.text
    step_texts = tree.xpath('//p[@class="text"]/text()')
    steps = [s.strip() for s in step_texts if s.strip() and len(s.strip()) > 3]

    # 封面图
    img_list = tree.xpath('//div[@class="cover-photo"]//img/@src')
    if not img_list:
        img_list = tree.xpath('//img[@class="cover-photo"]/@src')
    if not img_list:
        img_list = tree.xpath('//div[contains(@class, "recipe-show")]//img/@src')
    image_url = img_list[0] if img_list else ""

    # 描述
    desc_list = tree.xpath('//div[@class="desc"]/text()')
    description = desc_list[0].strip() if desc_list else ""

    return {
        "name": name,
        "description": description,
        "ingredients": ingredients,
        "steps": steps,
        "image_url": image_url,
        "source_url": url,
    }


# ===== 第4步: 批量抓取菜谱 =====
def scrape_recipes(recipe_urls, delay=2):
    """批量抓取菜谱详情"""
    recipes = []
    total = len(recipe_urls)
    success = 0

    for i, url in enumerate(recipe_urls):
        recipe_id = url.rstrip("/").split("/")[-1]
        print(f"  [{i+1}/{total}] {recipe_id}...", end=" ", flush=True)

        resp = fetch_page(url)
        if not resp:
            print("❌ failed")
            continue

        recipe = parse_recipe_detail(resp.text, url)
        recipe["id"] = recipe_id

        if recipe["name"] and recipe["ingredients"] and recipe["steps"]:
            recipes.append(recipe)
            success += 1
            print(f"✅ {recipe['name'][:25]}")
        else:
            missing = []
            if not recipe["name"]:
                missing.append("name")
            if not recipe["ingredients"]:
                missing.append(f"ing(0)")
            if not recipe["steps"]:
                missing.append(f"steps(0)")
            print(f"⚠️ incomplete: {', '.join(missing)}")

        if delay > 0:
            time.sleep(delay)

    print(f"\n📊 成功率: {success}/{total} ({success/total*100:.0f}%)" if total > 0 else "")
    return recipes


# ===== 第5步: 生成输出文件 =====
def generate_json(recipes):
    """生成 JSON"""
    return json.dumps(recipes, ensure_ascii=False, indent=2)


def generate_sql(recipes):
    """生成 SQL INSERT 语句"""
    lines = [
        "-- ============================================",
        f"-- 下厨房爬虫数据 - {len(recipes)} 道菜谱",
        f"-- 爬取时间: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "-- 请在 Supabase SQL Editor 中执行",
        "-- ============================================",
        "",
    ]

    for r in recipes:
        name = r["name"].replace("'", "''")
        desc = (r.get("description", "") or "").replace("'", "''")
        image = r.get("image_url", "") or ""
        source = r.get("source_url", "") or ""

        ingredients_json = json.dumps(r.get("ingredients", []), ensure_ascii=False).replace("'", "''")
        steps_text = "\n".join(r.get("steps", [])).replace("'", "''")

        lines.append(
            f"INSERT INTO recipes (name, category, type, flavor, ingredients, steps, "
            f"difficulty, prep_time, cook_time, servings, image_url, source_url, description) VALUES ("
        )
        lines.append(f"  '{name}',")
        lines.append(f"  '', -- category")
        lines.append(f"  '', -- type")
        lines.append(f"  '', -- flavor")
        lines.append(f"  '{ingredients_json}'::jsonb,")
        lines.append(f"  '{steps_text}',")
        lines.append(f"  '简单',")
        lines.append(f"  15,")
        lines.append(f"  20,")
        lines.append(f"  3,")
        lines.append(f"  '{image}',")
        lines.append(f"  '{source}',")
        lines.append(f"  '{desc}'")
        lines.append(f");")
        lines.append("")

    return "\n".join(lines)


# ===== 主流程 =====
def main():
    parser = argparse.ArgumentParser(description="下厨房菜谱爬虫 v2 (cookies + lxml)")
    parser.add_argument("--limit", type=int, default=50, help="每个分类最大抓取数量 (默认 50)")
    parser.add_argument("--delay", type=float, default=0.5, help="请求间隔秒数 (默认 0.5s，太小易触发 429)")
    parser.add_argument("--pages", type=int, default=2, help="每个分类扫描页数 (默认 2)")
    parser.add_argument("--categories", type=str, default="", help="指定分类名(逗号分隔)，留空=全部")
    parser.add_argument("--test", action="store_true", help="测试模式: 只抓1个分类的5道菜谱")
    args = parser.parse_args()

    print("=" * 60)
    print("🍳 下厨房菜谱爬虫 v2 (cookies + lxml)")
    print(f"   每分类上限: {args.limit} 道 | 间隔: {args.delay}s | 页数: {args.pages}")
    if args.test:
        print("   ⚡ 测试模式")
    print("=" * 60)

    # 1. 获取分类
    categories = get_all_categories()
    if not categories:
        print("❌ 未获取到分类")
        sys.exit(1)

    # 过滤分类
    if args.categories:
        wanted = set(args.categories.split(","))
        categories = [c for c in categories if c["name"] in wanted]

    if args.test:
        # 测试模式: 只取第一个分类的前3个二级分类
        categories = categories[:1]
        for c in categories:
            c["children"] = c["children"][:3]
        args.limit = 5
        args.pages = 1

    print(f"\n📋 将处理 {len(categories)} 个一级分类")

    all_recipes = []
    seen_urls = set()

    # 增量保存
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    progress_file = os.path.join(OUTPUT_DIR, f"recipes_{timestamp}_progress.json")
    save_counter = 0

    def save_progress():
        with open(progress_file, "w", encoding="utf-8") as f:
            json.dump(all_recipes, f, ensure_ascii=False, indent=2)

    for cat in categories:
        print(f"\n{'='*40}")
        print(f"📂 一级分类: {cat['name']} ({len(cat['children'])} 个二级分类)")
        print(f"{'='*40}", flush=True)

        for sub in cat["children"]:
            print(f"\n  🔖 二级分类: {sub['name']} → {sub['url']}", flush=True)

            # 2. 获取菜谱链接
            recipe_urls = get_recipe_urls_from_category(sub["url"], pages=args.pages)
            recipe_urls = [u for u in recipe_urls if u not in seen_urls]

            if not recipe_urls:
                print(f"    → 无菜谱链接，跳过")
                continue

            # 限制数量
            recipe_urls = recipe_urls[:args.limit]
            print(f"    → 将抓取 {len(recipe_urls)} 道菜谱", flush=True)

            # 3. 抓取详情
            recipes = scrape_recipes(recipe_urls, delay=args.delay)

            # 标记分类
            for r in recipes:
                r["category"] = cat["name"]
                r["subcategory"] = sub["name"]
                seen_urls.add(r["source_url"])

            all_recipes.extend(recipes)
            save_counter += len(recipes)
            print(f"    ✅ 当前分类累计: {len(recipes)} 道 | 总计: {len(all_recipes)} 道", flush=True)

            # 每 50 道保存一次进度
            if save_counter >= 50:
                save_progress()
                print(f"      💾 进度已保存 ({len(all_recipes)} 道)", flush=True)
                save_counter = 0

            # 分类间极短休息
            time.sleep(0.3)

    # 最终保存
    save_progress()

    if not all_recipes:
        print("\n❌ 未能抓取任何菜谱")
        sys.exit(1)

    # 4. 输出
    print(f"\n{'='*60}")
    print(f"🎉 全部完成！共抓取 {len(all_recipes)} 道菜谱")
    print(f"{'='*60}")

    # JSON
    json_path = os.path.join(OUTPUT_DIR, f"recipes_{timestamp}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        f.write(generate_json(all_recipes))
    print(f"📄 JSON: {json_path}")

    # SQL
    sql_path = os.path.join(OUTPUT_DIR, f"recipes_{timestamp}.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(generate_sql(all_recipes))
    print(f"📄 SQL:  {sql_path}")

    # 统计
    print(f"\n📊 统计:")
    cat_counts = {}
    for r in all_recipes:
        cat_counts[r.get("category", "?")] = cat_counts.get(r.get("category", "?"), 0) + 1
    for cat, count in sorted(cat_counts.items(), key=lambda x: -x[1]):
        print(f"   {cat}: {count} 道")

    avg_ing = sum(len(r.get("ingredients", [])) for r in all_recipes) / len(all_recipes)
    avg_steps = sum(len(r.get("steps", [])) for r in all_recipes) / len(all_recipes)
    print(f"   平均食材数: {avg_ing:.1f}")
    print(f"   平均步骤数: {avg_steps:.1f}")


if __name__ == "__main__":
    main()

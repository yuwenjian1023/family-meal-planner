# 食谱数据库设置指南

本指南将帮助你清空原有食谱数据，并从网络获取真实食谱数据填充到 Supabase 数据库。

## 📋 概述

本项目现已支持：
- ✅ 公共食谱数据库表（`recipes`）存储在 Supabase
- ✅ 60+ 道真实中国菜食谱数据
- ✅ 按菜系/类型/口味筛选
- ✅ 搜索功能
- ✅ 用户自定义食谱（独立存储）
- ✅ 收藏功能

---

## 🚀 快速开始

### 步骤 1：安装 Python 依赖

```bash
cd scripts
pip install -r requirements.txt
```

### 步骤 2：生成食谱数据

```bash
cd ..
python3 scripts/fetch-recipes.py
```

这会在 `data/` 目录生成：
- `recipes-data.json` - JSON 格式的食谱数据
- `recipes-import.sql` - SQL 导入脚本

### 步骤 3：在 Supabase 创建 recipes 表

登录 [Supabase Dashboard](https://app.supabase.com)，进入你的项目：

1. 打开 **SQL Editor**
2. 新建查询
3. 复制 `supabase-migration-public-recipes.sql` 文件内容并执行

或者使用命令行（需安装 supabase-cli）：

```bash
supabase db push
```

### 步骤 4：导入数据到 Supabase

**方法 A：使用 SQL 导入（推荐）**

在 Supabase SQL Editor 中执行 `data/recipes-import.sql` 文件内容。

**方法 B：使用 Python 脚本直接导入**

设置环境变量：

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

> 💡 **重要提示**: Service Role Key 在 Supabase Dashboard → Settings → API 中获取，注意不是 anon key！

运行导入脚本：

```bash
python3 scripts/import-recipes.py
```

脚本会询问是否清空现有数据，输入 `y` 确认。

### 步骤 5：配置环境变量

确保你的项目根目录 `.env` 文件包含：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 步骤 6：测试应用

```bash
npm run dev
```

访问 http://localhost:5173/recipes 查看食谱列表！

---

## 📊 数据统计

当前包含 60+ 道真实食谱，覆盖以下菜系：

| 菜系 | 数量 | 代表菜品 |
|------|------|----------|
| 川菜 | 10道 | 麻婆豆腐、宫保鸡丁、水煮鱼、回锅肉 |
| 粤菜 | 8道 | 白切鸡、蜜汁叉烧、烧鹅、广式蒸鱼 |
| 鲁菜 | 3道 | 糖醋鲤鱼、葱烧海参 |
| 苏菜 | 3道 | 松鼠桂鱼、狮子头 |
| 浙菜 | 3道 | 东坡肉、西湖醋鱼 |
| 湘菜 | 3道 | 剁椒鱼头、小炒黄牛肉 |
| 徽菜 | 2道 | 臭鳜鱼、毛豆腐 |
| 闽菜 | 3道 | 佛跳墙、荔枝肉 |
| 家常菜 | 12道 | 红烧肉、西红柿炒鸡蛋、糖醋排骨 |
| 汤类 | 4道 | 紫菜蛋花汤、冬瓜排骨汤 |
| 主食 | 5道 | 蛋炒饭、炒面、粥 |

---

## 🔧 高级操作

### 添加更多食谱

编辑 `scripts/fetch-recipes.py` 中的 `RECIPES_DATABASE` 数组，添加新菜品，然后重新运行：

```bash
python3 scripts/fetch-recipes.py
python3 scripts/import-recipes.py
```

### 清空所有食谱数据

在 Supabase SQL Editor 中执行：

```sql
DELETE FROM recipes;
```

### 只更新部分菜品

```sql
UPDATE recipes
SET name = '新菜名', difficulty = '中等'
WHERE id = 'recipe_0001';
```

---

## 📁 文件结构

```
family-meal-planner/
├── src/
│   ├── lib/
│   │   └── api.ts              # API 层（包含食谱 API）
│   ├── pages/
│   │   ├── RecipeListPage.tsx   # 食谱列表（从数据库读取）
│   │   └── RecipeDetailPage.tsx # 食谱详情（从数据库读取）
│   └── data/
│       └── recipes.ts           # 本地备用数据（可选）
├── scripts/
│   ├── fetch-recipes.py         # 生成食谱数据
│   ├── import-recipes.py        # 导入到 Supabase
│   └── requirements.txt         # Python 依赖
├── data/                        # 生成的数据文件
│   ├── recipes-data.json
│   └── recipes-import.sql
├── supabase-migration-public-recipes.sql  # 数据库表结构
└── RECIPES_SETUP.md             # 本文件
```

---

## ❓ 常见问题

### Q: 为什么我看不到食谱列表？

A: 请检查以下几点：
1. 确认 Supabase 项目配置正确
2. 确认 `recipes` 表已创建
3. 确认数据已成功导入
4. 打开浏览器控制台查看是否有错误信息

### Q: 如何添加图片支持？

A: 目前食谱使用 emoji + 渐变色作为封面。如果需要真实图片：
1. 上传图片到 Supabase Storage
2. 更新 `recipes` 表的 `image_url` 字段
3. 前端代码会自动显示图片（如果 `imageUrl` 有值）

### Q: 如何让用户也能上传食谱？

A: 目前只有管理员可以修改公共食谱表。用户创建的自定义菜谱存储在 `custom_recipes` 表，有独立的 RLS 策略。

### Q: 数据量太大，加载慢怎么办？

A: 可以实现：
1. 分页加载
2. 添加数据库索引（已预置）
3. 使用 React Query 缓存

---

## 📝 更新日志

### v2.0 - 数据库驱动版本
- ✅ 新增 `recipes` 公共食谱表
- ✅ 60+ 道真实中国菜食谱数据
- ✅ 从数据库动态读取食谱
- ✅ 保留用户自定义食谱功能
- ✅ 数据导入脚本

---

## 🆘 需要帮助？

1. 检查 Supabase 日志：Dashboard → Logs
2. 查看浏览器控制台错误
3. 确认 RLS 策略配置正确

祝你用餐愉快！🍳

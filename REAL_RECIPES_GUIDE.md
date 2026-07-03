# 真实食谱数据设置指南

## 📦 最快方式：使用预置数据集（推荐）

项目内置了 **21道真实中国菜谱**，直接运行即可使用：

```bash
python3 scripts/real_chinese_recipes.py
```

生成文件：
- `data/real_chinese_recipes.json` - JSON格式数据
- `data/real_chinese_recipes.sql` - SQL导入文件

包含分类：川菜 (5)、粤菜 (3)、湘菜 (2)、家常菜 (6)、汤类 (3)、主食 (2)

---

## 🚀 完整设置流程

### 步骤 1：创建数据库表

在 Supabase Dashboard → SQL Editor 中执行：
```sql
-- 执行文件内容
supabase-migration-public-recipes.sql
```

### 步骤 2：导入数据

在同一个 SQL Editor 窗口继续执行：
```sql
-- 执行文件内容
data/real_chinese_recipes.sql
```

或者使用 Python 脚本导入（需要配置环境变量）：
```bash
export SUPABASE_URL="你的项目URL"
export SUPABASE_SERVICE_KEY="你的Service Role Key"
python3 scripts/import_recipes.py
```

### 步骤 3：验证数据

在 Supabase Table Editor 中查看 `recipes` 表，应该能看到导入的菜谱数据。

---

## 📁 文件说明

```
family-meal-planner/
├── scripts/
│   ├── real_chinese_recipes.py  # 预置真实菜谱数据集（推荐）
│   ├── fetch_real_recipes.py    # API/手动模式获取更多菜谱
│   ├── recipe_scraper.py        # 网站爬虫（可能需要处理验证码）
│   ├── import_recipes.py        # Supabase导入脚本
│   └── requirements.txt         # Python依赖
├── data/
│   ├── real_chinese_recipes.json   # 预置菜谱数据（JSON）
│   └── real_chinese_recipes.sql    # 预置菜谱数据（SQL）
├── src/
│   ├── lib/api.ts               # 后端API（已更新支持数据库）
│   └── pages/
│       ├── RecipeListPage.tsx   # 菜谱列表（从数据库读取）
│       └── RecipeDetailPage.tsx # 菜谱详情（从数据库读取）
├── supabase-migration-public-recipes.sql  # 数据库表结构
└── REAL_RECIPES_GUIDE.md        # 本文件
```

---

## 🔧 获取更多菜谱

### 方式1：手动添加（推荐，适合少量）

编辑 `scripts/real_chinese_recipes.py` 中的 `REAL_RECIPES` 数组，添加新菜谱，然后重新运行脚本。

### 方式2：使用API获取（需要注册）

```bash
# 1. 注册免费API Key: https://spoonacular.com/food-api
# 2. 运行
export SPOONACULAR_API_KEY="你的API Key"
python3 scripts/fetch_real_recipes.py --mode api --count 50
```

### 方式3：手动输入模式

从下厨房、美食天下等网站复制菜谱信息，按提示粘贴：

```bash
python3 scripts/fetch_real_recipes.py --mode manual
```

### 方式4：爬虫方式（可能遇到验证码）

```bash
# 下厨房分类爬虫
python3 scripts/recipe_scraper.py --category-url "https://www.xiachufang.com/category/40076/" --count 20

# 美食天下
python3 scripts/recipe_scraper.py --source meishichina --keyword 川菜 --count 30
```

---

## 📊 数据字段说明

每道菜谱包含以下字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 唯一标识 | `recipe_0001` |
| `name` | 菜名 | `麻婆豆腐` |
| `category` | 菜系 | `川菜` |
| `type` | 类型 | `豆制品` |
| `flavor` | 口味 | `麻辣` |
| `ingredients` | 食材列表 | 数组，包含name/amount/unit |
| `steps` | 烹饪步骤 | 字符串数组 |
| `prep_time` | 准备时间（分钟） | `10` |
| `cook_time` | 烹饪时间（分钟） | `15` |
| `difficulty` | 难度 | `简单/中等/困难` |
| `servings` | 份量（人份） | `3` |
| `image_url` | 图片URL（可选） | 空或URL |
| `source` | 数据来源 | `下厨房` |
| `source_url` | 来源链接（可选） | 空或URL |
| `is_verified` | 是否已审核 | `true` |

---

## 🔍 前端使用说明

### 数据读取流程

1. **菜谱列表页** (`RecipeListPage.tsx`)
   - 加载时调用 `fetchAllRecipes()` 从数据库获取所有菜谱
   - 支持按菜系、类型、口味筛选
   - 支持搜索功能
   - 本地自定义菜谱会合并显示

2. **菜谱详情页** (`RecipeDetailPage.tsx`)
   - 根据 `id` 调用 `fetchRecipeById(id)` 获取详情
   - 显示完整食材和步骤
   - 支持收藏、添加到饮食计划

### API 函数说明（`src/lib/api.ts`）

```typescript
// 获取所有菜谱
fetchAllRecipes(): Promise<Recipe[]>

// 根据ID获取单道菜谱
fetchRecipeById(id: string): Promise<Recipe | null>

// 搜索菜谱
searchRecipes(query: string): Promise<Recipe[]>

// 按菜系获取菜谱
fetchRecipesByCategory(category: string): Promise<Recipe[]>
```

---

## ⚠️ 常见问题

### Q: 数据库表创建失败？
A: 检查是否有同名表存在，先删除旧表，或在SQL中添加 `IF NOT EXISTS`。

### Q: 数据导入失败？
A: 检查JSON格式是否正确，或查看 Supabase 日志确认错误信息。

### Q: 前端看不到数据？
A: 1. 确认表 `recipes` 存在且有数据
   2. 确认RLS策略正确（允许认证用户读取）
   3. 查看浏览器控制台是否有错误

### Q: 如何添加图片？
A: 可以手动更新 `image_url` 字段，或使用 Supabase Storage 存储图片后更新链接。

### Q: 爬虫被验证码阻挡？
A: 建议使用预置数据集或手动输入模式。如果需要大量数据，考虑：
- 使用付费API服务
- 手动从网站复制粘贴
- 查找公开的菜谱数据集

---

## ✨ 扩展建议

1. **添加更多菜谱**：继续在 `real_chinese_recipes.py` 中添加菜谱
2. **补充图片**：为菜谱添加真实图片URL
3. **分类优化**：根据需要调整菜系/类型分类
4. **营养信息**：可扩展添加营养成分字段
5. **视频教程**：可添加视频链接字段

---

## 📝 部署说明

### 本地开发
```bash
npm install
npm run dev
```

### 生产构建
```bash
npm run build
```

### 数据库迁移
首次部署或更新表结构时，需要在 Supabase 中执行相应的 migration SQL 文件。

---

祝您用餐愉快！🍳👨‍🍳

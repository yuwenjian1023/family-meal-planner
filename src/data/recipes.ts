// 兼容层 - 迁移到数据库读取
// 本文件保留以保持代码引用
// 实际数据存储在 Supabase 的 recipes 表中

import { Recipe } from '../types'

// 空数组，数据从数据库读取
export const allRecipes: Recipe[] = []

export const basicRecipes: Recipe[] = []

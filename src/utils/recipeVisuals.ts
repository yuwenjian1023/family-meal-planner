import { Recipe } from '../types'

/**
 * 菜品类型到 emoji 的映射
 * 根据菜品主要食材/类型选择合适的图标
 */
export const typeEmojiMap: Record<string, string> = {
  // 蛋类
  '蛋类': '🥚',
  
  // 肉类细分
  '肉类': '🥩',
  
  // 海鲜
  '海鲜': '🦐',
  
  // 汤类
  '汤': '🍲',
  
  // 蔬菜
  '蔬菜': '🥬',
  
  // 豆制品
  '豆制品': '🫓',
  
  // 主食
  '主食': '🍚',
  
  // 凉菜
  '凉菜': '🥗',
}

/**
 * 根据菜品名称关键词匹配更精确的 emoji
 * 优先级高于类型映射
 */
export function getRecipeEmoji(recipe: Recipe): string {
  const name = recipe.name
  
  // 肉类精确匹配
  if (name.includes('猪肉') || name.includes('红烧肉') || name.includes('五花肉') || name.includes('回锅肉') || name.includes('东坡肉')) return '🐷'
  if (name.includes('牛肉') || name.includes('牛腩') || name.includes('水煮牛肉') || name.includes('土豆牛腩')) return '🐮'
  if (name.includes('鸡肉') || name.includes('宫保') || name.includes('口水鸡') || name.includes('白切鸡') || name.includes('辣子鸡')) return '🍗'
  if (name.includes('鸭肉') || name.includes('烤鸭') || name.includes('啤酒鸭')) return '🦆'
  if (name.includes('排骨') || name.includes('糖醋排骨')) return '🍖'
  if (name.includes('羊肉') || name.includes('羊肉串') || name.includes('手抓羊肉')) return '🐑'
  
  // 海鲜精确匹配
  if (name.includes('鱼') || name.includes('鲫鱼') || name.includes('鲈鱼') || name.includes('清蒸鱼')) return '🐟'
  if (name.includes('虾') || name.includes('虾仁') || name.includes('龙虾') || name.includes('油爆虾')) return '🦐'
  if (name.includes('蟹') || name.includes('螃蟹') || name.includes('大闸蟹')) return '🦀'
  if (name.includes('贝') || name.includes('蛤蜊') || name.includes('扇贝')) return '🐚'
  if (name.includes('鱿鱼') || name.includes('章鱼')) return '🐙'
  
  // 蔬菜精确匹配
  if (name.includes('番茄') || name.includes('西红柿')) return '🍅'
  if (name.includes('土豆') || name.includes('马铃薯')) return '🥔'
  if (name.includes('茄子') || name.includes('鱼香茄子')) return '🍆'
  if (name.includes('白菜') || name.includes('娃娃菜')) return '🥬'
  if (name.includes('黄瓜')) return '🥒'
  if (name.includes('胡萝卜')) return '🥕'
  if (name.includes('玉米')) return '🌽'
  if (name.includes('蘑菇') || name.includes('香菇') || name.includes('口蘑')) return '🍄'
  if (name.includes('豆腐')) return '🧈'
  if (name.includes('莲藕') || name.includes('藕片')) return '🪷'
  if (name.includes('菠菜') || name.includes('油菜')) return '🌿'
  if (name.includes('南瓜')) return '🎃'
  if (name.includes('西兰花') || name.includes('花菜')) return '🥦'
  if (name.includes('青椒') || name.includes('辣椒')) return '🫑'
  if (name.includes('豆角') || name.includes('四季豆')) return '🫛'
  if (name.includes('笋') || name.includes('竹笋')) return '🎋'
  
  // 蛋类精确匹配
  if (name.includes('蛋')) return '🥚'
  
  // 主食精确匹配
  if (name.includes('饭') || name.includes('炒饭') || name.includes('拌饭') || name.includes('盖饭')) return '🍛'
  if (name.includes('面') || name.includes('面条') || name.includes('拉面') || name.includes('米粉')) return '🍜'
  if (name.includes('饺子') || name.includes('馄饨')) return '🥟'
  if (name.includes('包')) return '🥟'
  if (name.includes('饼')) return '🫓'
  if (name.includes('粥')) return '🥣'
  
  // 汤类精确匹配
  if (name.includes('汤')) return '🍲'
  
  // 其他常见食材
  if (name.includes('花生')) return '🥜'
  if (name.includes('核桃')) return '🌰'
  
  // 回退到类型映射
  return typeEmojiMap[recipe.type] || '🍳'
}

/**
 * 菜品类型的渐变背景色配置
 */
export const typeGradientMap: Record<string, { from: string; to: string }> = {
  '蛋类': { from: 'from-amber-100', to: 'to-yellow-200' },
  '肉类': { from: 'from-red-100', to: 'to-orange-200' },
  '海鲜': { from: 'from-cyan-100', to: 'to-blue-200' },
  '汤': { from: 'from-orange-100', to: 'to-amber-200' },
  '蔬菜': { from: 'from-green-100', to: 'to-emerald-200' },
  '豆制品': { from: 'from-stone-100', to: 'to-neutral-200' },
  '主食': { from: 'from-yellow-100', to: 'to-amber-200' },
  '凉菜': { from: 'from-teal-100', to: 'to-cyan-200' },
}

/**
 * 获取菜谱的渐变背景类名
 */
export function getRecipeGradient(recipe: Recipe): { from: string; to: string } {
  return typeGradientMap[recipe.type] || { from: 'from-primary-100', to: 'to-secondary-100' }
}

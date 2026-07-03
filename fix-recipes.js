const fs = require('fs')
const filePath = '/Users/ingeek/WorkBuddy/2026-07-01-10-37-48/family-meal-planner/src/data/recipes.ts'

let content = fs.readFileSync(filePath, 'utf8')

// 修复 ingredients 和 steps 数组中对象之间缺少的逗号
// 匹配模式：}\n  { （后面跟着 { name: 或 '）
content = content.replace(/}\n\s*{ name:/g, '},\n  { name:')
content = content.replace(/}\n\s*{ '/g, '},\n  { \'')

// 写回文件
fs.writeFileSync(filePath, content, 'utf8')
console.log('修复完成！')

import * as fs from 'fs';
import * as path from 'path';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9',
  'Cookie': 'bid=mVYpJnu2',
};

// Category pages on xiachufang
const CATEGORY_URLS = [
  { url: 'https://www.xiachufang.com/category/40076/', cat: '家常菜' },
  { url: 'https://www.xiachufang.com/category/51761/', cat: '川菜' },
  { url: 'https://www.xiachufang.com/category/51765/', cat: '粤菜' },
  { url: 'https://www.xiachufang.com/category/40071/', cat: '快手菜' },
  { url: 'https://www.xiachufang.com/category/40078/', cat: '下饭菜' },
  { url: 'https://www.xiachufang.com/category/40075/', cat: '海鲜' },
  { url: 'https://www.xiachufang.com/category/40073/', cat: '素菜' },
  { url: 'https://www.xiachufang.com/category/40072/', cat: '汤羹' },
  { url: 'https://www.xiachufang.com/category/51762/', cat: '湘菜' },
  { url: 'https://www.xiachufang.com/category/51764/', cat: '鲁菜' },
  { url: 'https://www.xiachufang.com/category/51766/', cat: '苏菜' },
  { url: 'https://www.xiachufang.com/category/51768/', cat: '浙菜' },
  { url: 'https://www.xiachufang.com/category/51769/', cat: '闽菜' },
  { url: 'https://www.xiachufang.com/category/51767/', cat: '徽菜' },
  { url: 'https://www.xiachufang.com/category/51756/', cat: '早餐' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchUrl(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
      if (res.ok) return await res.text();
      console.log(`  HTTP ${res.status}`);
    } catch (e) {
      console.log(`  Retry ${i + 1}: ${e.message}`);
    }
    if (i < 2) await sleep(2000);
  }
  return null;
}

// Regex-based HTML helpers
function matchAll(regex, str) {
  const results = [];
  let m;
  while ((m = regex.exec(str)) !== null) {
    results.push(m);
  }
  return results;
}

function htmlDecode(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'");
}

/**
 * Extract recipe IDs from a category listing page
 */
async function extractRecipeIds(categoryUrl, maxPages = 3) {
  const ids = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? categoryUrl : `${categoryUrl}?page=${page}`;
    console.log(`  Fetching: ${url}`);
    const html = await fetchUrl(url);
    if (!html) break;

    // Find all recipe links: href="/recipe/123456/"
    const matches = matchAll(/href="\/recipe\/(\d+)\/"/g, html);
    let count = 0;
    for (const m of matches) {
      if (!ids.has(m[1])) {
        ids.add(m[1]);
        count++;
      }
    }
    console.log(`  Found ${count} new IDs (total: ${ids.size})`);

    if (count < 5) break;
    if (page < maxPages) await sleep(2000);
  }

  return [...ids];
}

/**
 * Parse a single recipe page
 */
async function parseRecipe(recipeId, defaultCategory) {
  const url = `https://www.xiachufang.com/recipe/${recipeId}/`;
  const html = await fetchUrl(url);
  if (!html) return null;

  try {
    // ---- Extract name from title tag ----
    let name = '';
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const title = htmlDecode(titleMatch[1]);
      // Title format: "【菜名的做法步骤图，菜名怎么做好吃】作者_下厨房"
      const bracketMatch = title.match(/【(.+?)的[做法]/);
      if (bracketMatch) {
        name = bracketMatch[1].trim();
      } else {
        name = title.split('的做法')[0].split('【').pop()?.replace('】', '').trim() || '';
      }
    }

    // Fallback: look for h1
    if (!name || name.length > 30) {
      const h1Match = html.match(/<h1[^>]*class="[^"]*page-title[^"]*"[^>]*>([^<]+)<\/h1>/);
      if (h1Match) name = htmlDecode(h1Match[1]).trim();
    }

    if (!name || name.length === 0 || name.length > 30) return null;

    // ---- Extract image ----
    let imageUrl = '';
    const imgMatch = html.match(/src="(https:\/\/i\d+\.chuimg\.com\/[^"]+\.(?:jpg|png|jpeg|webp)[^"]*)"/);
    if (imgMatch) imageUrl = imgMatch[1];

    // ---- Extract ingredients ----
    const ingredients = [];

    // Try structured data first
    const ldJsonMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (ldJsonMatch) {
      try {
        const ld = JSON.parse(ldJsonMatch[1]);
        if (ld.recipeIngredient && Array.isArray(ld.recipeIngredient)) {
          for (const ing of ld.recipeIngredient) {
            if (typeof ing === 'string' && ing.trim()) {
              const parsed = parseIngredient(ing.trim());
              if (parsed) ingredients.push(parsed);
            }
          }
        }
      } catch {}
    }

    // Fallback: parse ingredient rows from HTML
    if (ingredients.length === 0) {
      // Look for <tr> elements with ingredient data
      const trMatches = matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g, html);
      for (const tr of trMatches) {
        const row = tr[1];
        // Remove HTML tags to get text
        const text = row.replace(/<[^>]+>/g, '').trim();
        if (!text || text.includes('用料') || text.includes('食材') || text.includes('调料')) continue;
        if (text.length < 2 || text.length > 40) continue;
        const parsed = parseIngredient(text);
        if (parsed) ingredients.push(parsed);
      }
    }

    // ---- Extract steps ----
    const steps = [];
    const ldJsonMatch2 = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (ldJsonMatch2) {
      try {
        const ld = JSON.parse(ldJsonMatch2[1]);
        let instructions = '';
        if (ld.recipeInstructions) {
          if (typeof ld.recipeInstructions === 'string') {
            instructions = ld.recipeInstructions;
          } else if (Array.isArray(ld.recipeInstructions)) {
            instructions = ld.recipeInstructions.map(s => typeof s === 'string' ? s : s.text || '').join('\n');
          }
        }
        if (instructions) {
          const stepParts = instructions.split(/\d+\.\s*/).filter(s => {
            const t = s.trim();
            return t.length > 3 && t.length < 200;
          });
          steps.push(...stepParts.map(s => s.trim()));
        }
      } catch {}
    }

    // Fallback: parse steps from HTML
    if (steps.length === 0) {
      // Look for step paragraphs
      const stepMatches = matchAll(/<p[^>]*class="[^"]*(?:text|step)[^"]*"[^>]*>([\s\S]*?)<\/p>/g, html);
      for (const sm of stepMatches) {
        const text = sm[1].replace(/<[^>]+>/g, '').trim();
        if (text.length > 3 && text.length < 200) steps.push(text);
      }
    }

    // Filter bad steps
    const filteredSteps = steps.filter(s => {
      const t = s.trim();
      return t.length > 3 && !t.match(/^\d+$/) && !t.startsWith('http');
    });

    // ---- Determine category ----
    let category = defaultCategory;

    // Check for category tags in the HTML
    const catMatch = html.match(/category\/(\d+)/);
    if (catMatch) {
      const catMap = {
        '40076': '家常菜', '40071': '快手菜', '40078': '下饭菜',
        '51761': '川菜', '51765': '粤菜', '51762': '湘菜',
        '51764': '鲁菜', '51766': '苏菜', '51768': '浙菜',
        '51769': '闽菜', '51767': '徽菜', '40075': '海鲜',
        '40073': '素菜', '40072': '汤羹', '51756': '早餐',
      };
      if (catMap[catMatch[1]]) category = catMap[catMatch[1]];
    }

    // ---- Determine type ----
    let type = '蔬菜';
    const ingredientNames = ingredients.map(i => i.name).join(',');
    const typePatterns = [
      [/肉|鸡|鸭|猪|牛|羊|排骨|蹄|肘|鹅/, '肉类'],
      [/鱼|虾|蟹|贝|鱿|海|参|蛤|蚝|鳗|鲈|鲫/, '海鲜'],
      [/蛋/, '蛋类'],
      [/豆|腐/, '豆制品'],
      [/面|饭|饼|饺|包|馒|粥|粉|米|馄饨|糕/, '主食'],
      [/汤/, '汤'],
      [/凉|拌|沙拉/, '凉菜'],
      [/菜|蔬|菌|菇|笋|藕|瓜|茄|椒/, '蔬菜'],
    ];
    for (const [pat, val] of typePatterns) {
      if (pat.test(name) || pat.test(ingredientNames)) {
        type = val;
        break;
      }
    }

    // ---- Determine flavor ----
    let flavor = '家常';
    const flavorPatterns = [
      [/辣|麻|香辣|麻辣|水煮|剁椒|泡椒/, '辣味'],
      [/酸|醋|糖醋|醋溜|酸甜/, '酸甜'],
      [/酱|红烧|卤|焖|炖|煲/, '酱香'],
      [/蒜|蒜蓉|蒜香/, '蒜香'],
      [/清蒸|白灼|清炖|清炒|白切/, '清淡'],
      [/咖喱/, '咖喱'],
      [/孜然/, '孜然'],
      [/葱油|葱烧/, '葱香'],
      [/椒盐/, '椒盐'],
      [/糖|拔丝/, '甜味'],
    ];
    for (const [pat, val] of flavorPatterns) {
      if (pat.test(name)) { flavor = val; break; }
    }

    // ---- Determine difficulty ----
    let difficulty = '简单';
    if (filteredSteps.length > 10 || ingredients.length > 10) difficulty = '中等';
    if (filteredSteps.length > 15) difficulty = '困难';
    if (/烧|红烧|炖|烤|焗|卤|焖/.test(name)) difficulty = '中等';
    if (/佛跳墙|功夫|汽锅|拔丝/.test(name)) difficulty = '困难';

    // ---- Estimate times ----
    let cookTime = 30;
    const timeMatch = html.match(/(\d+)\s*分钟/g);
    if (timeMatch) {
      const times = timeMatch.map(t => parseInt(t));
      cookTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      if (cookTime < 5) cookTime = 20;
      if (cookTime > 180) cookTime = 90;
    }
    if (difficulty === '困难') cookTime = Math.max(cookTime, 60);

    return {
      id: recipeId,
      name,
      category,
      type,
      flavor,
      ingredients: ingredients.length > 0 ? ingredients.slice(0, 15) : [{ name: '主料', amount: 500, unit: '克' }],
      steps: filteredSteps.length > 0 ? filteredSteps : [name + '的具体做法请参考原网站'],
      prepTime: Math.round(cookTime * 0.3) || 10,
      cookTime: cookTime || 20,
      difficulty,
      imageUrl,
      servings: 3,
    };
  } catch (e) {
    console.log(`  Parse error: ${e.message}`);
    return null;
  }
}

function parseIngredient(text) {
  // Common patterns:
  // "猪肉 300克"
  // "鸡蛋 2个"
  // "盐 适量"
  // "生抽 2勺"
  // "葱 2根"

  // Try "name amount" pattern
  const match = text.match(/^(.+?)\s+(\d+\.?\d*)\s*(克|千克|公斤|个|只|根|条|块|片|勺|匙|茶匙|汤匙|汤勺|毫升|升|把|颗|粒|碗|张|杯|滴|小勺|大勺|磅|两|斤)?$/);
  if (match) {
    return {
      name: match[1].trim(),
      amount: parseFloat(match[2]) || 0,
      unit: match[3] || '',
    };
  }

  // Try "适量/少许" suffix
  const vagueMatch = text.match(/^(.+?)\s+(适量|少许|若干)$/);
  if (vagueMatch) {
    return { name: vagueMatch[1].trim(), amount: 0, unit: vagueMatch[2] };
  }

  // Just name, no amount
  if (text.length > 1 && text.length < 20) {
    return { name: text.trim(), amount: 0, unit: '' };
  }

  return null;
}

/**
 * Generate TypeScript data files from recipes
 */
function generateTsFiles(recipes, scriptDir) {
  const outputDir = path.join(path.dirname(scriptDir), 'src', 'data');
  fs.mkdirSync(outputDir, { recursive: true });

  // Deduplicate by name
  const nameMap = new Map();
  const deduped = [];
  for (const r of recipes) {
    const existing = nameMap.get(r.name);
    if (!existing) {
      nameMap.set(r.name, r);
      deduped.push(r);
    } else {
      // Keep the one with more ingredients/steps
      if (r.ingredients.length + r.steps.length > existing.ingredients.length + existing.steps.length) {
        nameMap.set(r.name, r);
        const idx = deduped.findIndex(d => d.name === r.name);
        if (idx >= 0) deduped[idx] = r;
      }
    }
  }

  console.log(`After dedup: ${deduped.length} unique recipes`);

  // Format a single recipe as TS object literal
  function formatRecipe(r) {
    const parts = [];
    parts.push(`  {`);
    parts.push(`    id: '${r.id}',`);
    parts.push(`    name: '${r.name.replace(/'/g, "\\'")}',`);
    parts.push(`    category: '${r.category}',`);
    parts.push(`    type: '${r.type}',`);
    parts.push(`    flavor: '${r.flavor}',`);
    parts.push(`    ingredients: [`);
    for (const ing of r.ingredients) {
      parts.push(`      { name: '${ing.name.replace(/'/g, "\\'")}', amount: ${ing.amount}, unit: '${ing.unit}' },`);
    }
    parts.push(`    ],`);
    parts.push(`    steps: [`);
    for (const step of r.steps) {
      const escaped = step.replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/"/g, '\\"');
      parts.push(`      '${escaped}',`);
    }
    parts.push(`    ],`);
    parts.push(`    prepTime: ${r.prepTime},`);
    parts.push(`    cookTime: ${r.cookTime},`);
    parts.push(`    difficulty: '${r.difficulty}',`);
    parts.push(`    imageUrl: '${r.imageUrl || ''}',`);
    parts.push(`    servings: ${r.servings},`);
    parts.push(`  },`);
    return parts.join('\n');
  }

  // Generate one big file with all recipes
  const allLines = [
    `// Auto-generated recipe data from xiachufang.com`,
    `// Generated at: ${new Date().toISOString()}`,
    `// Total recipes: ${deduped.length}`,
    ``,
    `import { Recipe } from '../types';`,
    ``,
    `export const allRecipes: Recipe[] = [`,
  ];

  for (const r of deduped) {
    allLines.push(formatRecipe(r));
  }
  allLines.push(`];`);

  const allPath = path.join(outputDir, 'recipes.ts');
  fs.writeFileSync(allPath, allLines.join('\n'), 'utf-8');
  console.log(`Generated: ${allPath} (${deduped.length} recipes) [${(fs.statSync(allPath).size / 1024).toFixed(1)} KB]`);
}

// ---- Main ----
async function main() {
  console.log('=== Xiachufang Recipe Scraper ===\n');
  const scriptDir = import.meta.url.replace('file://', '');

  // Step 1: Collect all recipe IDs
  const allIds = new Map(); // id -> category
  for (const { url, cat } of CATEGORY_URLS) {
    console.log(`\n[${cat}] ${url}`);
    const ids = await extractRecipeIds(url, 2);
    for (const id of ids) {
      if (!allIds.has(id)) allIds.set(id, cat);
    }
    await sleep(2000);
  }

  console.log(`\n=== Total unique recipe IDs: ${allIds.size} ===`);

  // Step 2: Parse each recipe
  const recipes = [];
  const idEntries = [...allIds.entries()];
  let valid = 0;
  let skipped = 0;

  console.log(`\n=== Parsing ${idEntries.length} recipes ===\n`);

  for (let idx = 0; idx < idEntries.length; idx++) {
    const [rid, cat] = idEntries[idx];
    const pct = `${idx + 1}/${idEntries.length}`;

    const recipe = await parseRecipe(rid, cat);
    if (recipe && recipe.ingredients.length >= 1) {
      recipes.push(recipe);
      valid++;
      const status = recipe.steps.length >= 2 ? '✓' : '△';
      console.log(`[${pct}] ${status} ${recipe.name} | ${recipe.ingredients.length}ing ${recipe.steps.length}st | ${recipe.category}`);
    } else {
      skipped++;
      console.log(`[${pct}] ✗ recipe ${rid} (no data)`);
    }

    if (valid >= 250) {
      console.log(`\nReached 250 recipes, stopping.`);
      break;
    }

    if (idx % 10 === 9) await sleep(2000);
    else await sleep(800);
  }

  console.log(`\n=== Results ===`);
  console.log(`Valid recipes: ${valid}`);
  console.log(`Skipped: ${skipped}`);

  // Step 3: Generate TypeScript files
  if (recipes.length > 0) {
    generateTsFiles(recipes, scriptDir);
  }

  // Save JSON copy
  const jsonPath = path.join(path.dirname(scriptDir), 'scripts', 'scraped-recipes.json');
  fs.writeFileSync(jsonPath, JSON.stringify(recipes, null, 2), 'utf-8');
  console.log(`JSON saved: ${jsonPath}`);
}

main().catch(console.error);

export interface Recipe {
  id: string;
  name: string;
  category: string;
  type: string;
  flavor: string;
  ingredients: Ingredient[];
  steps: string[];
  prepTime: number;
  cookTime: number;
  difficulty: '简单' | '中等' | '困难';
  imageUrl?: string;
  servings: number;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  category: string;
}

export interface MealPlan {
  id: string;
  familyId: string;
  date: string;
  mealType: '早餐' | '午餐' | '晚餐';
  recipeId: string;
  recipe?: Recipe;
  createdBy: string;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  role: 'owner' | 'member';
  memberCount: number;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: 'owner' | 'member';
  email?: string;
  joinedAt: string;
}

export interface MissingIngredient {
  ingredient: string;
  amount: number;
  unit: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  createdAt: string;
}

// 自定义菜谱输入（不含 id/time 等自动字段）
export interface CustomRecipeInput {
  name: string;
  category: string;
  type: string;
  flavor: string;
  ingredients: Ingredient[];
  steps: string[];
  prepTime: number;
  cookTime: number;
  difficulty: '简单' | '中等' | '困难';
  servings: number;
  imageUrl?: string;
}

// 完整自定义菜谱（含 id/时间）
export interface CustomRecipe extends CustomRecipeInput {
  id: string;
  createdAt: string;
}

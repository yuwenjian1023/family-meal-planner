import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RecipeListPage from './pages/RecipeListPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import MealPlanPage from './pages/MealPlanPage'
import PantryPage from './pages/PantryPage'
import AuthPage from './pages/AuthPage'
import SettingsPage from './pages/SettingsPage'
import FamilyPage from './pages/FamilyPage'
import ShoppingListPage from './pages/ShoppingListPage'
import CustomRecipePage from './pages/CustomRecipePage'
import WeeklyCalendarPage from './pages/WeeklyCalendarPage'
import RecipeAdminPage from './pages/RecipeAdminPage'
import Navbar from './components/Navbar'

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recipes" element={<RecipeListPage />} />
            <Route path="/recipes/:id" element={<RecipeDetailPage />} />
            <Route path="/meal-plan" element={<MealPlanPage />} />
            <Route path="/pantry" element={<PantryPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/family" element={<FamilyPage />} />
            <Route path="/shopping-list" element={<ShoppingListPage />} />
            <Route path="/custom-recipe" element={<CustomRecipePage />} />
            <Route path="/weekly" element={<WeeklyCalendarPage />} />
            <Route path="/recipe-admin" element={<RecipeAdminPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

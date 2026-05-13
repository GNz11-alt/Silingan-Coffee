<template>
  <div class="menu-module">
    <header class="module-header">
      <div class="header-main">
        <h1>Menu & Pricing</h1>
        <p>Manage menu items, pricing, and ingredients</p>
      </div>
      
      <div class="header-actions">
        <button class="recipe-all-btn" @click="showAllRecipesModal = true">
          <BookOpen :size="18" />
          All Recipes
        </button>
        <button class="add-btn" @click="openAddModal">
          <Plus :size="18" />
          Add Menu Item
        </button>
      </div>
    </header>

    <div class="filters-bar">
      <div class="search-input">
        <SearchIcon :size="18" />
        <input v-model="searchQuery" placeholder="Search menu items..." />
      </div>
      
      <div class="custom-select">
        <button @click="toggleFilter">
          <Filter :size="16" />
          {{ selectedCategory }} <ChevronDown :size="16" />
        </button>
        <div v-if="showFilterDropdown" class="dropdown">
          <div v-for="cat in categories" :key="cat" @click="setCategory(cat)">
            {{ cat }}
          </div>
        </div>
      </div>
    </div>

    <div v-for="(items, category) in filteredGroupedItems" :key="category" class="menu-section">
      <h3 class="section-title">{{ category }}</h3>
      <div class="menu-grid">
        <div class="menu-card" v-for="item in items" :key="item.id" :class="{ 'item-disabled': item.disabled }">
          <div class="card-content">
            <div class="item-info">
              <div class="name-row">
                <Coffee :size="16" class="item-icon" />
                <h4>{{ item.name }}</h4>
              </div>
              <p class="description">{{ item.description }}</p>
            </div>
            
            <div class="recipe-status-area">
              <button v-if="item.recipe" class="recipe-btn view" @click="manageRecipe(item)">
                <ChefHat :size="14" /> View Recipe
              </button>
              <button v-else class="recipe-btn add" @click="manageRecipe(item)">
                <Plus :size="14" /> Add Recipe
              </button>
            </div>

            <div class="price-action-row">
              <span class="price">₱{{ item.price.toFixed(2) }}</span>
              <div class="card-actions">
                <button class="icon-btn edit" @click="editItem(item)"><Edit2 :size="16" /></button>
                <button class="disable-btn" @click="toggleDisable(item)">
                  {{ item.disabled ? 'Enable' : 'Disable' }}
                </button>
                <button class="delete-btn-red" @click="deleteItem(item.id)"><Trash2 :size="16" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <header>
          <div>
            <h3>{{ isEditing ? 'Edit Menu Item' : 'Add Menu Item' }}</h3>
            <p>{{ isEditing ? 'Update item details' : 'Create a new menu item' }}</p>
          </div>
          <button class="close-x-btn" @click="closeModal"><X :size="20" /></button>
        </header>

        <form @submit.prevent="saveItem">
          <div class="form-stack">
            <div class="field">
              <label>Item Name</label>
              <input v-model="form.name" required />
            </div>
            <div class="field">
              <label>Category</label>
              <div class="select-wrapper">
                <select v-model="form.category" required>
                  <option v-for="cat in categories.slice(1)" :key="cat">{{ cat }}</option>
                </select>
                <ChevronDown :size="16" class="select-icon" />
              </div>
            </div>
            <div class="field">
              <label>Description</label>
              <textarea v-model="form.description" rows="2"></textarea>
            </div>
            <div class="field">
              <label>Price (₱)</label>
              <input v-model.number="form.price" type="number" step="0.01" />
            </div>
          </div>
          <button type="submit" class="submit-full">{{ isEditing ? 'Update' : 'Add' }} Item</button>
        </form>
      </div>
    </div>

<div v-if="showRecipeModal" class="modal-overlay" @click.self="closeRecipeModal">
  <div class="modal-content recipe-modal">
    <header>
      <div>
        <h3>Recipe: {{ activeItem.name }}</h3>
        <p>Manage specific ingredients and measurements</p>
      </div>
      <button class="close-x-btn" @click="closeRecipeModal">
        <X :size="20" />
      </button>
    </header>

    <div class="recipe-body">
      <div class="ingredient-header">
        <label>Ingredient</label>
        <label>Qty</label>
        <label>Unit</label>
        <span></span> </div>
      
      <div class="ingredient-list">
        <div v-for="(ing, index) in recipeForm.ingredients" :key="index" class="ingredient-row">
          <div class="field-item">
            <input v-model="ing.name" placeholder="e.g. Milk" />
          </div>
          <div class="field-item">
            <input v-model.number="ing.qty" type="number" placeholder="0" />
          </div>
          <div class="field-item">
            <select v-model="ing.unit">
              <option v-for="u in ['g', 'ml', 'oz', 'pcs']" :key="u">{{ u }}</option>
            </select>
          </div>
          <button @click="removeIngredient(index)" class="remove-ing" title="Remove row">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>

      <button class="add-ing-btn" @click="addIngredient">
        <Plus :size="14" /> Add Ingredient
      </button>
    </div>

    <div class="form-actions">
      <button class="submit-full" @click="saveRecipe">Save Recipe</button>
    </div>
  </div>
</div>

    <div v-if="showAllRecipesModal" class="modal-overlay" @click.self="showAllRecipesModal = false">
      <div class="modal-content all-recipes-modal">
        <header>
          <h3>Master Recipe List</h3>
          <button class="close-x-btn" @click="showAllRecipesModal = false"><X :size="20" /></button>
        </header>
        <div class="all-recipes-scroll">
          <div v-for="item in menuItems" :key="item.id" class="recipe-summary-row">
            <div v-if="item.recipe" class="summary-item">
              <strong>{{ item.name }} ({{ item.category }})</strong>
              <ul>
                <li v-for="ing in item.recipe.ingredients" :key="ing.name">
                  {{ ing.name }}: {{ ing.qty }}{{ ing.unit }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { 
  Plus, Search as SearchIcon, ChevronDown, Edit2, Trash2, X, Coffee, Filter, 
  ChefHat, BookOpen 
} from 'lucide-vue-next';

//  DATA 
const menuItems = ref([
  { id: 1, name: 'Americano', category: 'Hot Coffee', description: 'Classic espresso with hot water', price: 120.00, disabled: false, recipe: { ingredients: [{ name: 'Espresso Beans', qty: 18, unit: 'g' }] } },
  { id: 2, name: 'Iced Latte', category: 'Cold Coffee', description: 'Espresso with cold milk', price: 160.00, disabled: false, recipe: null },
  { name: 'Cappuccino', category: 'Hot Coffee', description: 'Espresso with steamed milk and foam', price: 150.00, recipe: { ingredients: [{ name: 'Espresso Beans', qty: 18, unit: 'g' }, { name: 'Milk', qty: 150, unit: 'ml' }] } },
  { name: 'Latte', category: 'Hot Coffee', description: 'Espresso with steamed milk', price: 150.00, recipe: { ingredients: [{ name: 'Espresso Beans', qty: 18, unit: 'g' }, { name: 'Milk', qty: 150, unit: 'ml' }] } },
  { name: 'Mocha', category: 'Hot Coffee', description: 'Espresso with chocolate and steamed milk', price: 165.00, recipe: { ingredients: [{ name: 'Espresso Beans', qty: 18, unit: 'g' }, { name: 'Chocolate Syrup', qty: 30, unit: 'ml' }, { name: 'Milk', qty: 150, unit: 'ml' }] } },
]);

const categories = ['All Categories', 'Hot Coffee', 'Cold Coffee', 'Non-Coffee', 'Pastries', 'Food'];
const searchQuery = ref('');
const selectedCategory = ref('All Categories');
const showFilterDropdown = ref(false);
const showModal = ref(false);
const showRecipeModal = ref(false);
const showAllRecipesModal = ref(false);
const isEditing = ref(false);
const activeItem = ref(null);

const form = reactive({ name: '', category: 'Hot Coffee', description: '', price: 0 });
const recipeForm = reactive({ ingredients: [] });

// FILTER LOGIC 
const filteredGroupedItems = computed(() => {
  const filtered = menuItems.value.filter(i => {
    const s = i.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    const c = selectedCategory.value === 'All Categories' || i.category === selectedCategory.value;
    return s && c;
  });
  return filtered.reduce((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});
});

const toggleFilter = () => showFilterDropdown.value = !showFilterDropdown.value;
const setCategory = (cat) => { selectedCategory.value = cat; showFilterDropdown.value = false; };

// MENU ACTIONS 
const openAddModal = () => {
  isEditing.value = false;
  Object.assign(form, { name: '', category: 'Hot Coffee', description: '', price: 0 });
  showModal.value = true;
};

const editItem = (item) => {
  isEditing.value = true;
  activeItem.value = item;
  Object.assign(form, { ...item });
  showModal.value = true;
};

const saveItem = () => {
  if (isEditing.value) {
    const idx = menuItems.value.findIndex(i => i.id === activeItem.value.id);
    menuItems.value[idx] = { ...menuItems.value[idx], ...form };
  } else {
    menuItems.value.push({ ...form, id: Date.now(), disabled: false, recipe: null });
  }
  closeModal();
};

const toggleDisable = (item) => item.disabled = !item.disabled;

const deleteItem = (id) => {
  if (confirm("Delete this menu item?")) {
    menuItems.value = menuItems.value.filter(i => i.id !== id);
  }
};

const closeModal = () => showModal.value = false;

// RECIPE ACTIONS 
const manageRecipe = (item) => {
  activeItem.value = item;
  recipeForm.ingredients = item.recipe ? JSON.parse(JSON.stringify(item.recipe.ingredients)) : [{ name: '', qty: 0, unit: 'g' }];
  showRecipeModal.value = true;
};

const addIngredient = () => recipeForm.ingredients.push({ name: '', qty: 0, unit: 'g' });
const removeIngredient = (idx) => recipeForm.ingredients.splice(idx, 1);

const saveRecipe = () => {
  const idx = menuItems.value.findIndex(i => i.id === activeItem.value.id);
  menuItems.value[idx].recipe = { ingredients: [...recipeForm.ingredients] };
  showRecipeModal.value = false;
};

const closeRecipeModal = () => showRecipeModal.value = false;
</script>

<style scoped>
.menu-module { padding: 24px; background: #FAFAFA; min-height: 100vh; }
.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-actions { display: flex; gap: 12px; }

/* RECIPE STYLES */
.recipe-modal { 
  width: 550px !important; 
  max-width: 95vw;
}

.recipe-body {
  margin-top: 20px;
}
.recipe-status-area { margin-bottom: 12px; }
.recipe-btn { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; border: 1px solid #C49A6C; background: #FFF9F0; color: #C49A6C; }
.recipe-btn.add { border: 1px dashed #DDD; background: #F5F5F5; color: #999; }

.all-recipes-modal { width: 500px !important; max-height: 80vh; overflow-y: auto; }
.recipe-summary-row { border-bottom: 1px solid #EEE; padding: 15px 0; }
.recipe-summary-row ul { margin-top: 5px; color: #666; font-size: 13px; }

.recipe-all-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #EAEAEA;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: #31201D;
}

/* MODAL & BUTTONS */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; width: 480px; border-radius: 16px; padding: 32px; }
.close-x-btn { background: none; border: none; color: #999; cursor: pointer; }
.submit-full { width: 100%; background: #31201D; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 700; margin-top: 20px; cursor: pointer; }
.delete-btn-red { background: #DC2626; color: white; border: none; padding: 6px; border-radius: 6px; cursor: pointer; }
.disable-btn { border: 1px solid #EAEAEA; background: #F5F5F5; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.item-disabled { opacity: 0.5; filter: grayscale(1); }

.ingredient-header {
  display: grid;

  grid-template-columns: 2fr 1fr 1fr 40px; 
  gap: 12px;
  margin-bottom: 8px;
  padding: 0 4px;
}

.ingredient-header label {
  font-size: 12px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}


.ingredient-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 40px; 
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
}

.ingredient-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}


.ingredient-row input, 
.ingredient-row select {
  width: 100%;
  padding: 10px;
  border: 1px solid #EAEAEA;
  border-radius: 8px;
  background: #FAFAFA;
  font-size: 14px;
  outline: none;
  box-sizing: border-box; 
}

.ingredient-row input:focus, 
.ingredient-row select:focus {
  border-color: #C49A6C;
  background: #FFF9F0;
}

.ingredient-row input, 
.ingredient-row select {
  width: 100%;
  height: 42px; 
  padding: 0 12px;
  border: 1px solid #EAEAEA;
  border-radius: 8px;
  background: #FAFAFA;
  font-size: 14px;
  outline: none;
  box-sizing: border-box; 
  transition: all 0.2s ease;
}

/* Buttons and spacing */
.add-ing-btn {
  margin-top: 8px;
  background: none;
  border: 1px dashed #C49A6C;
  color: #C49A6C;
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.add-ing-btn:hover {
  background: #FFF9F0;
}
.remove-ing {
  background: none;
  border: none;
  color: #DC2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 6px;
  transition: background 0.2s;
}
.remove-ing:hover {
  background: #FEF2F2;
}

.menu-module { padding: 24px; background: #FAFAFA; min-height: 100vh; }
.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-actions { display: flex; gap: 12px; }
.add-btn { background: #31201D; color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; }

.filters-bar { display: flex; gap: 12px; margin-bottom: 32px; background: white; padding: 12px; border-radius: 12px; border: 1px solid #EAEAEA; }
.search-input { flex: 1; position: relative; display: flex; align-items: center; }
.search-input input { width: 100%; padding: 10px 12px 10px 40px; border: 1px solid #F5F5F5; background: #FAFAFA; border-radius: 8px; outline: none; }
.search-input svg { position: absolute; left: 12px; color: #999; }

/* DROPDOWN */
.custom-select { position: relative; }
.custom-select button { border: 1px solid #EAEAEA; background: white; padding: 10px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; color: #666; }
.dropdown { position: absolute; top: 100%; right: 0; width: 200px; background: white; border: 1px solid #EAEAEA; border-radius: 8px; margin-top: 4px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); z-index: 10; padding: 4px; }
.dropdown div { padding: 10px; cursor: pointer; border-radius: 6px; font-size: 14px; }
.dropdown div:hover { background: #FFF9F0; color: #C49A6C; }

/* GRID & CARDS */
.menu-section { margin-bottom: 30px; }
.section-title { font-size: 14px; color: #666; margin-bottom: 16px; font-weight: 600; }
.menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.menu-card { background: white; border: 1px solid #EAEAEA; border-radius: 12px; padding: 20px; position: relative; }
.item-disabled { opacity: 0.5; filter: grayscale(1); }

.name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.item-icon { color: #C49A6C; }
.price-action-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F5F5F5; padding-top: 16px; margin-top: 10px; }
.price { font-size: 18px; font-weight: 700; color: #31201D; }
.card-actions { display: flex; align-items: center; gap: 8px; }

/* ACTION BUTTONS */
.icon-btn { border: 1px solid #EAEAEA; background: white; padding: 6px; border-radius: 6px; color: #666; cursor: pointer; }
.disable-btn { border: 1px solid #EAEAEA; background: #F5F5F5; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.delete-btn-red { background: #DC2626; color: white; border: none; padding: 6px; border-radius: 6px; cursor: pointer; }


.close-x-btn {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.close-x-btn:hover {
  background: #F5F5F5;
  color: #31201D;
}

/* FORM STYLES */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; width: 480px; border-radius: 16px; padding: 32px; }
.modal-content header { display: flex; justify-content: space-between; margin-bottom: 24px; }
.form-stack { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 14px; font-weight: 600; color: #31201D; }
.field input, .field select, .field textarea { padding: 12px; border: 1px solid #EAEAEA; border-radius: 8px; background: #FAFAFA; outline: none; }
.field input:hover, .field select:hover { background: #FFF9F0; border-color: #C49A6C; }
.select-wrapper { position: relative; display: flex; align-items: center; }
.select-wrapper select { width: 100%; appearance: none; }
.select-icon { position: absolute; right: 12px; pointer-events: none; color: #999; }
.submit-full { width: 100%; background: #31201D; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 700; margin-top: 24px; cursor: pointer; }
</style>
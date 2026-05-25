<template>
  <div class="menu-module">
    <header class="module-header">
      <div class="header-main">
        <h1>Menu & Pricing</h1>
        <p>Manage menu items, pricing, and recipes</p>
      </div>
      <div class="header-actions">
        <button class="recipe-all-btn" @click="openAllRecipes">
          <BookOpen :size="16" /> All Recipes
        </button>
        <button class="add-btn" @click="openAddModal">
          <Plus :size="16" /> Add Menu Item
        </button>
      </div>
    </header>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-input">
        <SearchIcon :size="16" />
        <input v-model="searchQuery" placeholder="Search menu items..." />
      </div>
      <div class="select-wrap">
        <select v-model="filterCategory" class="filter-sel">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <ChevronDown :size="13" class="sel-icon" />
      </div>
      <div class="select-wrap">
        <select v-model="filterBranch" class="filter-sel">
          <option :value="null">All Branches</option>
          <option v-for="b in branches" :key="b.BranchId" :value="b.BranchId">{{ b.BranchName }}</option>
        </select>
        <ChevronDown :size="13" class="sel-icon" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div> Loading menu items...
    </div>

    <!-- Empty -->
    <div v-else-if="Object.keys(filteredGrouped).length === 0" class="empty-state">
      <Coffee :size="40" style="opacity:0.2; display:block; margin: 0 auto 12px;" />
      <p>No menu items found.</p>
    </div>

    <!-- Menu Grid grouped by Category -->
    <div v-else v-for="(items, category) in filteredGrouped" :key="category" class="menu-section">
      <h3 class="section-title">
        {{ category }}
        <span class="count-chip">{{ items.length }}</span>
      </h3>
      <div class="menu-grid">
        <div class="menu-card" v-for="item in items" :key="item.ProductId"
          :class="{ 'item-disabled': item._disabled }">
          <div class="card-top">
            <span class="cat-label">{{ item.Category ?? 'Uncategorized' }}</span>
            <span class="branch-label">{{ getBranchName(item.BranchId) }}</span>
          </div>
          <div class="card-body">
            <div class="name-row">
              <Coffee :size="15" class="item-icon" />
              <h4>{{ item.ProductName }}</h4>
            </div>

          </div>

          <div class="recipe-status-area">
            <button v-if="item._recipeCount > 0" class="recipe-btn view"
              @click="openRecipeModal(item)">
              <ChefHat :size="13" /> Recipe ({{ item._recipeCount }} ingredients)
            </button>
            <button v-else class="recipe-btn add" @click="openRecipeModal(item)">
              <Plus :size="13" /> Add Recipe
            </button>
          </div>

          <div class="price-action-row">
            <span class="price">{{ item.Price != null ? '₱' + item.Price.toFixed(2) : '—' }}</span>
            <div class="card-actions">
              <button class="icon-btn edit" @click="openEditModal(item)" title="Edit">
                <Edit2 :size="15" />
              </button>
              <button class="icon-btn delete" @click="deleteItem(item.ProductId)" title="Delete">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD / EDIT PRODUCT MODAL -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <header class="modal-hdr">
          <div>
            <h3>{{ isEditing ? 'Edit Menu Item' : 'Add Menu Item' }}</h3>
            <p>{{ isEditing ? 'Update product details' : 'Add a new product to the menu' }}</p>
          </div>
          <button class="close-x-btn" @click="closeModal"><X :size="18" /></button>
        </header>

        <div class="form-stack">
          <div class="field">
            <label>Product Name *</label>
            <input v-model="form.ProductName" required placeholder="e.g. Iced Latte" />
          </div>
          <div class="field">
            <label>Category *</label>
            <div class="select-wrap full">
              <select v-model="form.Category" required>
                <option value="">Select category</option>
                <option value="Beverages">Beverages</option>
                <option value="Pastries">Pastries</option>
                <option value="Food">Food</option>
              </select>
              <ChevronDown :size="13" class="sel-icon" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Price (₱)</label>
              <input type="number" v-model.number="form.Price" step="0.01" min="0"
                placeholder="0.00" />
            </div>
            <div class="field">
              <label>Branch *</label>
              <div class="select-wrap full">
                <select v-model="form.BranchId" required>
                  <option :value="null">Select branch</option>
                  <option v-for="b in branches" :key="b.BranchId" :value="b.BranchId">
                    {{ b.BranchName }}
                  </option>
                </select>
                <ChevronDown :size="13" class="sel-icon" />
              </div>
            </div>
          </div>
        </div>

        <button class="submit-full" :disabled="saving" @click="saveItem">
          {{ saving ? 'Saving...' : (isEditing ? 'Update Item' : 'Add Item') }}
        </button>
      </div>
    </div>

    <!-- RECIPE MODAL -->
    <div v-if="showRecipeModal" class="modal-overlay" @click.self="closeRecipeModal">
      <div class="modal-content recipe-modal">
        <header class="modal-hdr">
          <div>
            <h3>Recipe: {{ activeItem?.ProductName }}</h3>
            <p>Raw materials and quantities needed to make this product</p>
          </div>
          <button class="close-x-btn" @click="closeRecipeModal"><X :size="18" /></button>
        </header>

        <div class="recipe-body">
          <div class="ingredient-header">
            <label>Raw Material</label>
            <label>Qty Needed</label>
            <label>Unit</label>
            <span></span>
          </div>

          <div class="ingredient-list">
            <div v-for="(ing, i) in recipeRows" :key="i" class="ingredient-row">
              <div class="field-item">
                <div class="select-wrap full">
                  <select v-model="ing.rawproductid">
                    <option :value="null">Select raw material</option>
                    <option v-for="rp in rawProducts" :key="rp.rawproductid" :value="rp.rawproductid">
                      {{ rp.name }} 
                    </option>
                  </select>
                  <ChevronDown :size="12" class="sel-icon" />
                </div>
              </div>
              <div class="field-item">
                <input v-model.number="ing.quantityneeded" type="number" min="0" placeholder="0" />
              </div>
              <div class="field-item">
                <div class="select-wrap full">
                  <select v-model="ing.unit">
                    <option v-for="u in ['g', 'kg', 'ml', 'l', 'pcs', 'oz', 'tbsp', 'tsp']" :key="u">
                      {{ u }}
                    </option>
                  </select>
                  <ChevronDown :size="12" class="sel-icon" />
                </div>
              </div>
              <button class="remove-ing" @click="recipeRows.splice(i, 1)" title="Remove">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div v-if="recipeRows.length === 0" class="empty-recipe">
            No ingredients yet. Add one below.
          </div>

          <button class="add-ing-btn" @click="recipeRows.push({ rawproductid: null, quantityneeded: 0, unit: 'g' })">
            <Plus :size="14" /> Add Ingredient
          </button>
        </div>

        <div class="form-actions">
          <button class="cancel-btn" @click="closeRecipeModal">Cancel</button>
          <button class="submit-full-sm" :disabled="savingRecipe" @click="saveRecipe">
            {{ savingRecipe ? 'Saving...' : 'Save Recipe' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ALL RECIPES MODAL -->
    <div v-if="showAllRecipesModal" class="modal-overlay" @click.self="showAllRecipesModal = false">
      <div class="modal-content all-recipes-modal">
        <header class="modal-hdr">
          <div>
            <h3>Master Recipe List</h3>
            <p>All products with their raw material requirements</p>
          </div>
          <button class="close-x-btn" @click="showAllRecipesModal = false"><X :size="18" /></button>
        </header>

        <div v-if="loadingAllRecipes" class="loading-state" style="padding: 40px;">
          <div class="spinner"></div> Loading...
        </div>

        <div v-else class="all-recipes-scroll">
          <div v-if="allRecipesSummary.length === 0" class="empty-state" style="padding: 40px;">
            <p>No recipes have been added yet.</p>
          </div>
          <div v-for="row in allRecipesSummary" :key="row.ProductId" class="recipe-summary-row">
            <div class="summary-product">
              <Coffee :size="14" class="item-icon" />
              <strong>{{ row.ProductName }}</strong>
              <span class="summary-cat">{{ row.Category }}</span>
              <span class="summary-price">₱{{ row.Price?.toFixed(2) ?? '—' }}</span>
            </div>
            <ul class="summary-ingredients">
              <li v-for="r in row.recipes" :key="r.recipeid">
                <span class="ing-name">{{ r.rawName }}</span>
                <span class="ing-qty">{{ r.quantityneeded }} {{ r.unit }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  Plus, Search as SearchIcon, ChevronDown, Edit2, Trash2,
  X, Coffee, ChefHat, BookOpen
} from 'lucide-vue-next';
import { supabase } from '@/supabase';

const route = useRoute();

// State
const menuItems   = ref([]);
const rawProducts = ref([]);
const branches    = ref([]);
const loading     = ref(false);

const searchQuery   = ref('');
const filterCategory = ref('');

const filterBranch  = ref(null);

// Product modal
const showModal  = ref(false);
const isEditing  = ref(false);
const editingId  = ref(null);
const saving     = ref(false);
const form       = ref({
  ProductName: '', Category: '', Price: null, BranchId: null
});

// Recipe modal
const showRecipeModal = ref(false);
const activeItem      = ref(null);
const recipeRows      = ref([]);
const savingRecipe    = ref(false);
const existingRecipeIds = ref([]); // track which rows already exist in DB

// All recipes modal
const showAllRecipesModal = ref(false);
const allRecipesSummary   = ref([]);
const loadingAllRecipes   = ref(false);

// Computed
const categories = computed(() => {
  const cats = menuItems.value.map(i => i.Category).filter(Boolean);
  return [...new Set(cats)].sort();
});

const filteredGrouped = computed(() => {
  let list = [...menuItems.value];

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(i => i.ProductName?.toLowerCase().includes(q));
  }
  if (filterCategory.value)
    list = list.filter(i => i.Category === filterCategory.value);
  if (filterBranch.value)
    list = list.filter(i => i.BranchId === filterBranch.value);

  // Group by Category
  return list.reduce((acc, i) => {
    const cat = i.Category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(i);
    return acc;
  }, {});
});

// Fetch
const fetchBranches = async () => {
  const { data } = await supabase
    .from('branch').select('BranchId, BranchName').order('BranchName');
  if (data) branches.value = data;
};

const fetchRawProducts = async () => {
  // rawproduct is now standalone with name, category, unit, stockquantity
  const { data, error } = await supabase
    .from('rawproduct')
    .select('rawproductid, name, category, unit, reorderlevel, stockquantity, expirationdate')
    .order('name');
  if (error) console.error('fetchRawProducts error:', error.message);
  if (data) rawProducts.value = data;
};

const fetchMenuItems = async () => {
  loading.value = true;

  // Fetch all products
  const { data: products, error } = await supabase
    .from('product')
    .select('ProductId, ProductName, ProductType, Category, Price, BranchId, CreatedAt')
    .order('Category')
    .order('ProductName');

  if (error) { console.error(error.message); loading.value = false; return; }

  // Fetch recipe counts per finishedproductid
  const { data: recipes } = await supabase
    .from('recipe')
    .select('recipeid, finishedproductid');

  // Count recipes per product
  const recipeCounts = {};
  (recipes ?? []).forEach(r => {
    recipeCounts[r.finishedproductid] = (recipeCounts[r.finishedproductid] || 0) + 1;
  });

  menuItems.value = (products ?? []).map(p => ({
    ...p,
    _recipeCount: recipeCounts[p.ProductId] || 0,
    _disabled: false,
  }));

  loading.value = false;
};

// Product CRUD 
const openAddModal = () => {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    ProductName: '', Category: '', Price: null,
    BranchId: filterBranch.value
  };
  showModal.value = true;
};

const openEditModal = (item) => {
  isEditing.value = true;
  editingId.value = item.ProductId;
  form.value = {
    ProductName: item.ProductName,
    Category: item.Category ?? '',
    Price: item.Price,
    BranchId: item.BranchId,
  };
  showModal.value = true;
};

const closeModal = () => { showModal.value = false; };

const saveItem = async () => {
  if (!form.value.ProductName || !form.value.BranchId) {
    alert('Product name and branch are required.');
    return;
  }
  saving.value = true;

  const payload = {
    ProductName: form.value.ProductName,
    Category: form.value.Category || null,
    Price: form.value.Price ?? null,
    BranchId: form.value.BranchId,
  };

  let error;
  if (isEditing.value) {
    ({ error } = await supabase.from('product').update(payload).eq('ProductId', editingId.value));
  } else {
    ({ error } = await supabase.from('product').insert(payload));
  }

  if (error) alert('Failed to save: ' + error.message);
  else { await fetchMenuItems(); closeModal(); }
  saving.value = false;
};

const deleteItem = async (id) => {
  if (!confirm('Delete this product? This will also delete its recipes.')) return;
  // Delete recipes first
  await supabase.from('recipe').delete().eq('finishedproductid', id);
  const { error } = await supabase.from('product').delete().eq('ProductId', id);
  if (error) alert('Failed to delete: ' + error.message);
  else await fetchMenuItems();
};

// Recipe CRUD
const openRecipeModal = async (item) => {
  activeItem.value = item;
  recipeRows.value = [];
  existingRecipeIds.value = [];

  // Load existing recipe rows for this product
  const { data, error } = await supabase
    .from('recipe')
    .select('recipeid, finishedproductid, rawproductid, quantityneeded, unit')
    .eq('finishedproductid', item.ProductId);

  if (!error && data) {
    recipeRows.value = data.map(r => ({
      recipeid: r.recipeid,
      rawproductid: r.rawproductid,
      quantityneeded: r.quantityneeded,
      unit: r.unit ?? 'g',
    }));
    existingRecipeIds.value = data.map(r => r.recipeid);
  }

  // Start with one empty row if no recipes
  if (recipeRows.value.length === 0) {
    recipeRows.value.push({ rawproductid: null, quantityneeded: 0, unit: 'g' });
  }

  showRecipeModal.value = true;
};

const closeRecipeModal = () => { showRecipeModal.value = false; activeItem.value = null; };

const saveRecipe = async () => {
  if (!activeItem.value) return;

  const validRows = recipeRows.value.filter(r => r.rawproductid && r.quantityneeded > 0);
  if (validRows.length === 0) {
    alert('Please add at least one ingredient with a valid quantity.');
    return;
  }

  savingRecipe.value = true;

  // Delete all existing recipes for this product, then re-insert
  // simplest approach for add edit remvove
  const { error: delError } = await supabase
    .from('recipe')
    .delete()
    .eq('finishedproductid', activeItem.value.ProductId);

  if (delError) {
    alert('Failed to update recipe: ' + delError.message);
    savingRecipe.value = false;
    return;
  }

  const inserts = validRows.map(r => ({
    finishedproductid: activeItem.value.ProductId,
    rawproductid: r.rawproductid,  // FK to rawproduct.rawproductid
    quantityneeded: r.quantityneeded,
    unit: r.unit,
  }));

  const { error: insError } = await supabase.from('recipe').insert(inserts);

  if (insError) {
    alert('Failed to save recipe: ' + insError.message);
  } else {
    await fetchMenuItems();
    closeRecipeModal();
  }
  savingRecipe.value = false;
};

// All Recipes
const openAllRecipes = async () => {
  showAllRecipesModal.value = true;
  loadingAllRecipes.value = true;

  // fetch all recipes with rawproductid
  const { data: recipes, error: recipeErr } = await supabase
    .from('recipe')
    .select('recipeid, finishedproductid, rawproductid, quantityneeded, unit');

  if (recipeErr) { console.error(recipeErr.message); loadingAllRecipes.value = false; return; }

  // fetch all rawproducts for name lookup
  const { data: raws } = await supabase
    .from('rawproduct')
    .select('rawproductid, name, unit');

  const rawMap = {};
  (raws ?? []).forEach(r => { rawMap[r.rawproductid] = r; });

  // fetch all products that have at least one recipe
  const productIds = [...new Set((recipes ?? []).map(r => r.finishedproductid))];
  if (productIds.length === 0) {
    allRecipesSummary.value = [];
    loadingAllRecipes.value = false;
    return;
  }

  const { data: products } = await supabase
    .from('product')
    .select('ProductId, ProductName, Category, Price')
    .in('ProductId', productIds)
    .order('Category')
    .order('ProductName');

  // merge — attach recipe rows (with raw name) to each product
  allRecipesSummary.value = (products ?? []).map(p => ({
    ...p,
    recipes: (recipes ?? [])
      .filter(r => r.finishedproductid === p.ProductId)
      .map(r => ({
        ...r,
        rawName: rawMap[r.rawproductid]?.name ?? '—',
        rawUnit: rawMap[r.rawproductid]?.unit ?? '',
      }))
  }));

  loadingAllRecipes.value = false;
};

//Helpers 
const getBranchName = (id) =>
  branches.value.find(b => b.BranchId === id)?.BranchName ?? '—';

//Init
onMounted(async () => {
  await Promise.all([fetchBranches(), fetchRawProducts(), fetchMenuItems()]);

  // Pre-select branch from logged-in user
  const branchSlug = localStorage.getItem('branch');
  if (branchSlug && branchSlug !== 'all') {
    const match = branches.value.find(b =>
      b.BranchName?.toLowerCase().includes(branchSlug.toLowerCase())
    );
    if (match) filterBranch.value = match.BranchId;
  }

  // Auto-open edit modal from search result click
  const editId = route.query.edit;
  if (editId) {
    const item = menuItems.value.find(p => String(p.ProductId) === editId);
    if (item) openEditModal(item);
  }
});
</script>

<style scoped>
.menu-module { padding: 24px 32px; background: #FAFAFA; min-height: 100vh; font-family: 'Inter', sans-serif; }

/* HEADER */
.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-main h1 { font-size: 26px; font-weight: 800; color: #31201D; margin: 0; }
.header-main p { font-size: 14px; color: #888; margin: 4px 0 0; }
.header-actions { display: flex; gap: 10px; }
.recipe-all-btn { display: flex; align-items: center; gap: 7px; background: white; border: 1px solid #ddd; padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; color: #31201D; transition: 0.2s; }
.recipe-all-btn:hover { border-color: #31201D; }
.add-btn { display: flex; align-items: center; gap: 7px; background: #31201D; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: 0.2s; }
.add-btn:hover { background: #4a3330; }

/* FILTERS */
.filters-bar { display: flex; gap: 12px; margin-bottom: 28px; background: white; padding: 12px 16px; border-radius: 12px; border: 1px solid #eee; flex-wrap: wrap; align-items: center; }
.search-input { flex: 1; min-width: 180px; position: relative; display: flex; align-items: center; }
.search-input input { width: 100%; padding: 9px 12px 9px 36px; border: 1px solid #eee; background: #fafafa; border-radius: 8px; outline: none; font-size: 14px; }
.search-input svg { position: absolute; left: 10px; color: #999; }
.select-wrap { position: relative; }
.select-wrap.full { max-width: 100%; }
.filter-sel { appearance: none; padding: 9px 32px 9px 12px; border: 1px solid #eee; border-radius: 8px; font-size: 14px; background: white; outline: none; cursor: pointer; min-width: 150px; transition: border-color 0.2s; }
.filter-sel:focus { border-color: #31201D; }
.sel-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; pointer-events: none; }

/* LOADING / EMPTY */
.loading-state { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 60px; color: #999; font-size: 14px; }
.spinner { width: 18px; height: 18px; border: 2px solid #eee; border-top-color: #31201D; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state { text-align: center; padding: 60px; color: #bbb; font-size: 15px; }

/* MENU SECTION */
.menu-section { margin-bottom: 32px; }
.section-title { font-size: 13px; font-weight: 700; color: #888; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; }
.count-chip { background: #f0f0f0; color: #666; font-size: 12px; padding: 1px 8px; border-radius: 20px; font-weight: 600; text-transform: none; letter-spacing: 0; }

/* GRID */
.menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }

/* CARD */
.menu-card { background: white; border: 1px solid #eee; border-radius: 14px; padding: 18px 20px; transition: box-shadow 0.2s; display: flex; flex-direction: column; gap: 10px; }
.menu-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
.item-disabled { opacity: 0.45; filter: grayscale(0.6); }

.card-top { display: flex; align-items: center; gap: 7px; }
.cat-label { font-size: 11px; font-weight: 700; color: #C49A6C; background: #FFF9F0; padding: 2px 8px; border-radius: 4px; }
.branch-label { margin-left: auto; font-size: 11px; color: #bbb; font-weight: 500; }

.card-body { }
.name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.item-icon { color: #C49A6C; flex-shrink: 0; }
.name-row h4 { margin: 0; font-size: 15px; font-weight: 700; color: #31201D; }
.category-text { font-size: 12px; color: #aaa; margin: 0; padding-left: 23px; }

/* RECIPE BUTTON */
.recipe-status-area { }
.recipe-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.recipe-btn.view { border: 1px solid #C49A6C; background: #FFF9F0; color: #C49A6C; }
.recipe-btn.view:hover { background: #fff0dc; }
.recipe-btn.add { border: 1px dashed #ddd; background: #fafafa; color: #bbb; }
.recipe-btn.add:hover { border-color: #C49A6C; color: #C49A6C; background: #fff9f0; }

/* PRICE ROW */
.price-action-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f5f5f5; padding-top: 12px; margin-top: 2px; }
.price { font-size: 18px; font-weight: 800; color: #31201D; }
.card-actions { display: flex; align-items: center; gap: 6px; }
.icon-btn { border: 1px solid #eee; background: white; padding: 6px; border-radius: 6px; color: #666; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.icon-btn.edit:hover { border-color: #31201D; color: #31201D; }
.icon-btn.delete:hover { border-color: #dc2626; color: #dc2626; background: #fee2e2; }

/* MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: white; width: 500px; max-width: 95vw; border-radius: 16px; padding: 28px 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); max-height: 92vh; overflow-y: auto; }
.modal-content.recipe-modal { width: 580px; }
.modal-content.all-recipes-modal { width: 560px; }
.modal-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.modal-hdr h3 { font-size: 18px; font-weight: 700; color: #31201D; margin: 0 0 3px; }
.modal-hdr p { font-size: 13px; color: #888; margin: 0; }
.close-x-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; border-radius: 50%; transition: 0.2s; flex-shrink: 0; }
.close-x-btn:hover { background: #f5f5f5; color: #31201D; }

/* FORM */
.form-stack { display: flex; flex-direction: column; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field label { font-size: 12px; font-weight: 700; color: #31201D; text-transform: uppercase; letter-spacing: 0.04em; }
.field input, .field textarea { padding: 10px 13px; border: 1px solid #eee; border-radius: 8px; background: #fafafa; outline: none; font-size: 14px; transition: 0.2s; }
.field input:focus, .field textarea:focus { border-color: #C49A6C; background: white; }
.field input:hover, .field textarea:hover { border-color: #C49A6C; }
.select-wrap.full select { width: 100%; appearance: none; padding: 10px 32px 10px 12px; border: 1px solid #eee; border-radius: 8px; font-size: 14px; background: #fafafa; outline: none; cursor: pointer; }
.select-wrap.full select:focus { border-color: #C49A6C; }

/* SUBMIT */
.submit-full { width: 100%; background: #31201D; color: white; border: none; padding: 13px; border-radius: 8px; font-weight: 700; font-size: 15px; margin-top: 20px; cursor: pointer; transition: 0.2s; }
.submit-full:hover:not(:disabled) { background: #4a3330; }
.submit-full:disabled { opacity: 0.5; cursor: not-allowed; }

/* RECIPE BODY */
.recipe-body { margin-bottom: 16px; }
.ingredient-header { display: grid; grid-template-columns: 2fr 1fr 1fr 36px; gap: 10px; margin-bottom: 8px; padding: 0 2px; }
.ingredient-header label { font-size: 11px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.04em; }
.ingredient-list { max-height: 280px; overflow-y: auto; padding: 2px; }
.ingredient-row { display: grid; grid-template-columns: 2fr 1fr 1fr 36px; gap: 10px; margin-bottom: 10px; align-items: center; }
.field-item { }
.ingredient-row input { width: 100%; height: 40px; padding: 0 12px; border: 1px solid #eee; border-radius: 8px; background: #fafafa; font-size: 14px; outline: none; transition: 0.2s; box-sizing: border-box; }
.ingredient-row input:focus { border-color: #C49A6C; background: white; }
.ingredient-row .select-wrap.full select { height: 40px; padding: 0 28px 0 10px; }
.remove-ing { background: none; border: none; color: #dc2626; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 6px; border-radius: 6px; transition: 0.2s; }
.remove-ing:hover { background: #fee2e2; }
.add-ing-btn { margin-top: 10px; background: none; border: 1px dashed #C49A6C; color: #C49A6C; width: 100%; padding: 11px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s; }
.add-ing-btn:hover { background: #fff9f0; }
.empty-recipe { text-align: center; color: #bbb; padding: 20px; font-size: 14px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #f0f0f0; padding-top: 18px; }
.cancel-btn { background: #f5f5f5; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.submit-full-sm { background: #31201D; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.submit-full-sm:hover:not(:disabled) { background: #4a3330; }
.submit-full-sm:disabled { opacity: 0.5; cursor: not-allowed; }

/* ALL RECIPES */
.all-recipes-scroll { max-height: 65vh; overflow-y: auto; }
.recipe-summary-row { border-bottom: 1px solid #f0f0f0; padding: 16px 0; }
.recipe-summary-row:last-child { border-bottom: none; }
.summary-product { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.summary-product strong { font-size: 14px; color: #31201D; }
.summary-cat { font-size: 12px; color: #888; }
.summary-price { font-size: 13px; font-weight: 700; color: #C49A6C; margin-left: auto; }
.summary-ingredients { margin: 0; padding: 0 0 0 22px; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.summary-ingredients li { display: flex; justify-content: space-between; font-size: 13px; color: #555; padding: 4px 8px; background: #fafafa; border-radius: 6px; }
.ing-name { font-weight: 500; }
.ing-qty { color: #999; font-size: 12px; }

@media (max-width: 1024px) { .menu-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .menu-grid { grid-template-columns: 1fr; } .field-row { grid-template-columns: 1fr; } }
</style>
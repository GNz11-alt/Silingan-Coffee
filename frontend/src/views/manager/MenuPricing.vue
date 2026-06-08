<template>
  <div class="menu-module">
    <header class="module-header">
      <div class="header-main">
        <h1>Menu &amp; Pricing</h1>
        <p>
          Manage menu items, pricing, and recipes — changes apply to all
          branches
        </p>
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

    <!-- Stock legend banner -->
    <div class="stock-legend-bar">
      <span class="leg-item"
        ><span class="leg-dot oos"></span>Out of Stock</span
      >
      <span class="leg-item"><span class="leg-dot low"></span>Low Stock</span>
      <span class="leg-item"
        ><span class="leg-dot recipe-ok"></span>Recipe Set</span
      >
      <span class="leg-item"
        ><span class="leg-dot no-recipe"></span>No Recipe</span
      >
      <span class="leg-sep">·</span>
      <span class="leg-note"></span>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="search-input">
        <SearchIcon :size="16" />
        <input v-model="searchQuery" placeholder="Search menu items..." />
      </div>
      <div class="select-wrap">
        <select v-model="filterCategory" class="filter-sel">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
        <ChevronDown :size="13" class="sel-icon" />
      </div>
      <div class="select-wrap">
        <select v-model="filterStock" class="filter-sel">
          <option value="">All Stock Status</option>
          <option value="available">Available</option>
          <option value="low">Low Stock</option>
          <option value="oos">Out of Stock</option>
          <option value="no_recipe">No Recipe</option>
        </select>
        <ChevronDown :size="13" class="sel-icon" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      Loading menu items...
    </div>

    <!-- Empty -->
    <div
      v-else-if="Object.keys(filteredGrouped).length === 0"
      class="empty-state"
    >
      <Coffee
        :size="40"
        style="opacity: 0.2; display: block; margin: 0 auto 12px"
      />
      <p>No menu items found.</p>
    </div>

    <!-- Menu Grid grouped by Category -->
    <div
      v-else
      v-for="(items, category) in filteredGrouped"
      :key="category"
      class="menu-section"
    >
      <h3 class="section-title">
        {{ category }}
        <span class="count-chip">{{ items.length }}</span>
        <span
          v-if="items.some((i) => getStockStatus(i) === 'oos')"
          class="section-oos-warn"
        >
          <AlertTriangle :size="12" />
          {{ items.filter((i) => getStockStatus(i) === "oos").length }} out of
          stock
        </span>
      </h3>
      <div class="menu-grid">
        <div
          class="menu-card"
          v-for="item in items"
          :key="item.ProductId"
          :class="[
            `stock-${getStockStatus(item)}`,
            item._recipeCount === 0 ? 'no-recipe-card' : '',
          ]"
        >
          <!-- Stock status ribbon -->
          <div :class="['stock-ribbon', `ribbon-${getStockStatus(item)}`]">
            <span v-if="getStockStatus(item) === 'oos'"
              ><XCircle :size="10" /> Out of Stock</span
            >
            <span v-else-if="getStockStatus(item) === 'low'"
              ><AlertTriangle :size="10" /> Low Stock</span
            >
            <span v-else-if="item._recipeCount === 0"
              ><BookOpen :size="10" /> No Recipe</span
            >
            <span v-else><CheckCircle :size="10" /> Available</span>
          </div>

          <div class="card-top">
            <div class="card-image" v-if="item.image_url">
              <img :src="item.image_url" :alt="item.ProductName" />
            </div>
            <div class="card-image placeholder" v-else>
              <Coffee :size="28" />
            </div>
          </div>

          <div class="card-body">
            <div class="name-row">
              <Coffee :size="15" class="item-icon" />
              <h4>{{ item.ProductName }}</h4>
            </div>

            <!-- Size prices -->
            <div
              v-if="getSizeType(item.Category) !== 'none' && item.size_prices"
              class="size-prices"
            >
              <span
                v-for="(price, size) in item.size_prices"
                :key="size"
                class="size-price-tag"
              >
                {{ size }}: ₱{{ price.toFixed(2) }}
              </span>
            </div>

            <!-- Stock detail (only if recipe set) -->
            <div
              v-if="item._recipeCount > 0 && item._stockDetail"
              class="stock-detail-row"
            >
              <span
                v-for="shortage in item._stockDetail.slice(0, 2)"
                :key="shortage.rawproductid"
                class="shortage-chip"
              >
                <AlertTriangle :size="9" /> {{ shortage.name }}:
                {{ +shortage.available.toFixed(2) }}/{{
                  +shortage.needed.toFixed(2)
                }}
                {{ shortage.unit }}
              </span>
            </div>
          </div>

          <!-- Recipe status -->
          <div class="recipe-status-area">
            <button
              v-if="item._recipeCount > 0"
              class="recipe-btn view"
              @click="openRecipeModal(item)"
            >
              <ChefHat :size="13" /> Recipe ({{
                item._recipeCount
              }}
              ingredient{{ item._recipeCount !== 1 ? "s" : "" }})
            </button>
            <button
              v-else
              class="recipe-btn add"
              @click="openRecipeModal(item)"
            >
              <Plus :size="13" /> Add Recipe
            </button>
          </div>

          <div class="price-action-row">
            <span class="price">{{
              item.Price != null ? "₱" + item.Price.toFixed(2) : "—"
            }}</span>
            <div class="card-actions">
              <button
                class="icon-btn edit"
                @click="openEditModal(item)"
                title="Edit"
              >
                <Edit2 :size="15" />
              </button>
              <button
                class="icon-btn delete"
                @click="deleteItem(item.ProductId)"
                title="Delete"
              >
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ ADD / EDIT PRODUCT MODAL ══ -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <header class="modal-hdr">
          <div>
            <h3>{{ isEditing ? "Edit Menu Item" : "Add Menu Item" }}</h3>
            <p>
              {{
                isEditing
                  ? "Updates will apply across all branches"
                  : "New item will be available to all branches"
              }}
            </p>
          </div>
          <button class="close-x-btn" @click="closeModal">
            <X :size="18" />
          </button>
        </header>
        <div class="form-stack">
          <div class="field">
            <label>Product Name *</label>
            <input
              v-model="form.ProductName"
              required
              placeholder="e.g. Iced Latte"
            />
          </div>
          <div class="field">
            <label>Category *</label>
            <div class="select-wrap full">
              <select
                v-model="form.Category"
                required
                @change="onCategoryChange"
              >
                <option value="">Select category</option>
                <option v-for="cat in categories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
              <ChevronDown :size="13" class="sel-icon" />
            </div>
          </div>
          <div class="field">
            <label>Product Image</label>
            <div class="image-upload-area">
              <img
                v-if="form.image_url"
                :src="form.image_url"
                class="preview-img"
              />
              <label class="upload-label">
                <input
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  hidden
                />
                {{ form.image_url ? "Change Image" : "+ Upload Image" }}
              </label>
            </div>
          </div>
          <div class="field" v-if="getSizeType(form.Category) !== 'none'">
            <label>Size Prices *</label>
            <div class="sizes-container">
              <div
                v-for="size in getSizeLabels(form.Category)"
                :key="size"
                class="size-price-row"
              >
                <span class="size-name">{{ size }}</span>
                <div class="size-price-input">
                  <span class="currency">₱</span>
                  <input
                    type="number"
                    v-model.number="form.sizePrices[size]"
                    step="0.01"
                    min="0"
                    :placeholder="size + ' price'"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
          <div class="field" v-if="getSizeType(form.Category) === 'none'">
            <label>Price (₱)</label>
            <input
              type="number"
              v-model.number="form.Price"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>
        </div>
        <button class="submit-full" :disabled="saving" @click="saveItem">
          {{ saving ? "Saving..." : isEditing ? "Update Item" : "Add Item" }}
        </button>
      </div>
    </div>

    <!-- ══ RECIPE MODAL ══ -->
    <div
      v-if="showRecipeModal"
      class="modal-overlay"
      @click.self="closeRecipeModal"
    >
      <div class="modal-content recipe-modal">
        <header class="modal-hdr">
          <div>
            <h3>Recipe: {{ activeItem?.ProductName }}</h3>
            <p>
              Raw materials and quantities needed.
              <strong class="unit-hint"></strong>
            </p>
          </div>
          <button class="close-x-btn" @click="closeRecipeModal">
            <X :size="18" />
          </button>
        </header>

        <div v-if="loadingRecipe" class="loading-state" style="padding: 30px">
          <div class="spinner"></div>
          Loading recipe...
        </div>

        <div v-else class="recipe-body">
          <!-- Stock availability preview for this product -->
          <div
            v-if="recipeStockPreview.length > 0"
            class="recipe-stock-preview"
          >
            <div class="rsp-header">
              <AlertTriangle :size="14" /> Stock issues with current recipe:
            </div>
            <div
              v-for="s in recipeStockPreview"
              :key="s.rawproductid"
              class="rsp-row"
            >
              <span class="rsp-name">{{ s.name }}</span>
              <span class="rsp-detail"
                >{{ +s.available.toFixed(2) }} {{ s.unit }} available, need
                {{ +s.needed.toFixed(2) }} {{ s.unit }}</span
              >
            </div>
          </div>
          <div
            v-else-if="recipeRows.length > 0 && !loadingRecipe"
            class="recipe-stock-ok"
          >
            <CheckCircle :size="14" /> All ingredients currently in stock
          </div>

          <div class="ingredient-header">
            <label>Raw Material</label>
            <label>Qty Needed</label>
            <label>Unit <span class="unit-auto-tag">auto</span></label>
            <span></span>
          </div>

          <div class="ingredient-list">
            <div v-for="(ing, i) in recipeRows" :key="i" class="ingredient-row">
            <!-- Raw material picker — grouped by category -->
            <div class="field-item">
              <div class="select-wrap full">
                <select v-model="ing.rawproductid" @change="onRawProductChange(ing)">
                  <option :value="null">Select raw material</option>
                  <template v-for="cat in rawProductCategories" :key="cat">
                    <optgroup :label="cat">
                      <option
                        v-for="rp in rawProductsByCategory[cat]"
                        :key="rp.rawproductid"
                        :value="rp.rawproductid"
                      >
                        {{ rp.name }} ({{ rp.unit }})
                      </option>
                    </optgroup>
                  </template>
                </select>
                <ChevronDown :size="12" class="sel-icon" />
              </div>
            </div>

              <!-- Quantity -->
              <div class="field-item">
                <input
                  v-model.number="ing.quantityneeded"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                />
              </div>

              <!-- Unit — auto-filled, but editable -->
              <div class="field-item unit-field">
                <div class="select-wrap full">
                  <select v-model="ing.unit">
                    <option
                      v-for="u in getCompatibleUnits(ing.rawproductid)"
                      :key="u"
                    >
                      {{ u }}
                    </option>
                  </select>
                  <ChevronDown :size="12" class="sel-icon" />
                </div>
                <span
                  v-if="
                    ing.unit &&
                    ing.rawproductid &&
                    getInventoryUnit(ing.rawproductid) !== ing.unit
                  "
                  class="convert-hint"
                >
                  →
                  {{
                    formatConvertHint(
                      ing.quantityneeded,
                      ing.unit,
                      getInventoryUnit(ing.rawproductid),
                    )
                  }}
                </span>
              </div>

              <!-- Stock available for this ingredient -->

              <button
                class="remove-ing"
                @click="recipeRows.splice(i, 1)"
                title="Remove"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div v-if="recipeRows.length === 0" class="empty-recipe">
            No ingredients yet. Add one below.
          </div>

          <button class="add-ing-btn" @click="addIngredientRow">
            <Plus :size="14" /> Add Ingredient
          </button>
        </div>

        <div class="form-actions">
          <button class="cancel-btn" @click="closeRecipeModal">Cancel</button>
          <button
            class="submit-full-sm"
            :disabled="savingRecipe"
            @click="saveRecipe"
          >
            {{ savingRecipe ? "Saving..." : "Save Recipe" }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══ DELETE CONFIRM MODAL ══ -->
    <div
      v-if="showDeleteModal"
      class="modal-overlay"
      @click.self="showDeleteModal = false"
    >
      <div class="modal-content" style="max-width: 420px">
        <header class="modal-hdr">
          <h3>Remove Item</h3>
          <button class="close-x-btn" @click="showDeleteModal = false">
            <X :size="18" />
          </button>
        </header>
        <hr class="delete-divider" />
        <p class="delete-body-text">
          Remove <strong>{{ deleteTarget?.ProductName }}</strong> and ALL its
          batches? This cannot be undone.
        </p>
        <hr class="delete-divider" />
        <div class="delete-actions">
          <button class="btn-delete-cancel" @click="showDeleteModal = false">
            Cancel
          </button>
          <button class="btn-delete-confirm" @click="confirmDelete">
            Remove
          </button>
        </div>
      </div>
    </div>

    <!-- ══ ALL RECIPES MODAL ══ -->
    <div
      v-if="showAllRecipesModal"
      class="modal-overlay"
      @click.self="showAllRecipesModal = false"
    >
      <div class="modal-content all-recipes-modal">
        <header class="modal-hdr">
          <div>
            <h3>Master Recipe List</h3>
            <p>All products with their raw material requirements</p>
          </div>
          <button class="close-x-btn" @click="showAllRecipesModal = false">
            <X :size="18" />
          </button>
        </header>
        <div
          v-if="loadingAllRecipes"
          class="loading-state"
          style="padding: 40px"
        >
          <div class="spinner"></div>
          Loading...
        </div>
        <div
          v-else-if="allRecipesSummary.length === 0"
          class="empty-state"
          style="padding: 40px"
        >
          <p>No recipes have been added yet.</p>
        </div>
        <div v-else class="all-recipes-layout">
          <div class="recipe-sidebar">
            <button
              v-for="cat in allRecipeCategories"
              :key="cat"
              class="cat-tab"
              :class="{ active: activeRecipeCategory === cat }"
              @click="activeRecipeCategory = cat"
            >
              <span class="cat-tab-name">{{ cat }}</span>
              <span class="cat-tab-count">{{
                allRecipesByCategory[cat]?.length ?? 0
              }}</span>
            </button>
          </div>
          <div class="recipe-panel">
            <div class="recipe-search">
              <SearchIcon :size="14" />
              <input v-model="recipeSearch" placeholder="Search recipes..." />
            </div>
            <div class="recipe-panel-scroll">
              <div
                v-for="row in filteredRecipePanel"
                :key="row.ProductId"
                class="recipe-card"
                :class="{ expanded: expandedRecipe === row.ProductId }"
                @click="
                  expandedRecipe =
                    expandedRecipe === row.ProductId ? null : row.ProductId
                "
              >
                <div class="recipe-card-header">
                  <div class="recipe-card-left">
                    <Coffee :size="14" class="item-icon" />
                    <span class="recipe-card-name">{{ row.ProductName }}</span>
                    <span class="recipe-ing-pill"
                      >{{ row.recipes.length }} ingredients</span
                    >
                  </div>
                  <div class="recipe-card-right">
                    <span class="recipe-card-price"
                      >₱{{ row.Price?.toFixed(2) ?? "—" }}</span
                    >
                    <ChevronDown
                      :size="14"
                      class="expand-icon"
                      :class="{ rotated: expandedRecipe === row.ProductId }"
                    />
                  </div>
                </div>
                <div
                  v-if="expandedRecipe === row.ProductId"
                  class="recipe-card-body"
                >
                  <div
                    v-for="r in row.recipes"
                    :key="r.recipeid"
                    class="ing-row"
                  >
                    <span class="ing-dot"></span>
                    <span class="ing-name">{{ r.rawName }}</span>
                    <span class="ing-qty"
                      >{{ r.quantityneeded }} {{ r.unit }}</span
                    >
                    <span
                      v-if="r.unit !== r.rawUnit && r.rawUnit"
                      class="ing-inv-unit"
                      >(inv: {{ r.rawUnit }})</span
                    >
                  </div>
                </div>
              </div>
              <div
                v-if="filteredRecipePanel.length === 0"
                class="empty-recipe"
                style="padding: 32px"
              >
                No recipes found.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  Plus,
  Search as SearchIcon,
  ChevronDown,
  Edit2,
  Trash2,
  X,
  Coffee,
  ChefHat,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-vue-next";
import { supabase } from "@/supabase";
import {
  convertUnit,
  canConvert,
  normaliseNeeded,
  checkStockForProduct,
  suggestRecipeUnit,
  formatQtyDisplay,
} from "@/composables/inventoryUtils.js";

const route = useRoute();

// ─── Cache ────────────────────────────────────────────────────────────────────
const CACHE_KEY_MENU = "cache_menu_items";
const CACHE_KEY_RAW = "cache_raw_products";
const CACHE_KEY_STOCK = "cache_stock_map";
const CACHE_KEY_RECIPES = "cache_all_recipes";
const CACHE_TTL_MENU = 5 * 60 * 1000;
const CACHE_TTL_RAW = 5 * 60 * 1000;
const CACHE_TTL_STOCK = 1 * 60 * 1000;
const CACHE_TTL_RECIPES = 5 * 60 * 1000;

const saveCache = (key, data, ttl) =>
  sessionStorage.setItem(
    key,
    JSON.stringify({ data, expiresAt: Date.now() + ttl }),
  );

const loadCache = (key) => {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (Date.now() > parsed.expiresAt) {
    sessionStorage.removeItem(key);
    return null;
  }
  return parsed.data;
};

// ─── Size helpers ─────────────────────────────────────────────────────────────
const getSizeType = (cat) => {
  if (!cat) return "none";
  const c = cat.toLowerCase();
  if (c.includes("hot drink") || c.includes("hot coffee") || c === "hot drinks")
    return "hot";
  if (
    c.includes("iced coffee") ||
    c.includes("iced") ||
    c.includes("frap") ||
    c.includes("frappe") ||
    c.includes("smoothie")
  )
    return "iced";
  return "none";
};
const getSizeLabels = (cat) => {
  const t = getSizeType(cat);
  if (t === "hot") return ["Small", "Regular"];
  if (t === "iced") return ["Regular", "Big"];
  return [];
};

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const UNIT_GROUPS = {
  weight: ["g", "kg", "oz", "lb"],
  volume: ["ml", "l", "tsp", "tbsp", "fl_oz", "cup"],
  count: ["pcs"],
};

function getUnitGroup(unit) {
  for (const [grp, units] of Object.entries(UNIT_GROUPS)) {
    if (units.includes(unit?.toLowerCase())) return grp;
  }
  return null;
}

function getCompatibleUnits(rawproductid) {
  if (!rawproductid) return ["g", "kg", "ml", "l", "pcs", "oz", "tbsp", "tsp"];
  const rp = rawProducts.value.find((r) => r.rawproductid === rawproductid);
  if (!rp?.unit) return ["g", "kg", "ml", "l", "pcs", "oz", "tbsp", "tsp"];
  const grp = getUnitGroup(rp.unit);
  return grp ? UNIT_GROUPS[grp] : [rp.unit];
}

function getInventoryUnit(rawproductid) {
  return (
    rawProducts.value.find((r) => r.rawproductid === rawproductid)?.unit ?? null
  );
}

function formatConvertHint(qty, fromUnit, toUnit) {
  if (!qty || !fromUnit || !toUnit || fromUnit === toUnit) return "";
  const c = convertUnit(qty, fromUnit, toUnit);
  if (c === null) return "⚠ incompatible units";
  return `${+c.toFixed(2)} ${toUnit} in inventory`;
}

function formatIngStock(ing) {
  if (!ing.rawproductid) return "—";
  const invUnit = getInventoryUnit(ing.rawproductid);
  const avail = stockMap.value[ing.rawproductid] ?? 0;
  return formatQtyDisplay(avail, invUnit);
}

function getIngStockClass(ing) {
  if (!ing.rawproductid || !ing.quantityneeded) return "neutral";
  const invUnit = getInventoryUnit(ing.rawproductid);
  const needed = normaliseNeeded(ing.quantityneeded, ing.unit, invUnit);
  const avail = stockMap.value[ing.rawproductid] ?? 0;
  if (avail <= 0) return "danger";
  if (avail < needed) return "warn";
  return "ok";
}

// ─── State ────────────────────────────────────────────────────────────────────
const menuItems = ref([]);
const rawProducts = ref([]);
const stockMap = ref({}); // { rawproductid → net qty in inventory unit }
const allRecipes = ref([]); // full recipe list for stock checks
const loading = ref(false);
const searchQuery = ref("");
const filterCategory = ref("");
const filterStock = ref("");

const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const saving = ref(false);
const form = ref({
  ProductName: "",
  Category: "",
  Price: null,
  sizePrices: {},
  image_url: null,
});

const showRecipeModal = ref(false);
const loadingRecipe = ref(false);
const activeItem = ref(null);
const recipeRows = ref([]);
const savingRecipe = ref(false);

const showAllRecipesModal = ref(false);
const allRecipesSummary = ref([]);
const loadingAllRecipes = ref(false);
const activeRecipeCategory = ref("");
const recipeSearch = ref("");
const expandedRecipe = ref(null);

// ─── Computed ─────────────────────────────────────────────────────────────────
const categories = computed(() =>
  [...new Set(menuItems.value.map(i => i.Category).filter(Boolean))].sort()
)

// ─── Grouped raw products for recipe dropdown ─────────────────────────────────
const rawProductCategories = computed(() =>
  [...new Set(
    rawProducts.value
      .filter(r => r.status !== 'Archived')
      .map(r => r.category || 'Other')
  )].sort()
)

const rawProductsByCategory = computed(() => {
  const map = {}
  rawProducts.value
    .filter(r => r.status !== 'Archived')
    .forEach(r => {
      const cat = r.category || 'Other'
      if (!map[cat]) map[cat] = []
      map[cat].push(r)
    })
  Object.values(map).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)))
  return map
})

function getStockStatus(item) {
  if (item._recipeCount === 0) return "no_recipe";
  const shortages = checkStockForProduct(
    item.ProductId,
    1,
    allRecipes.value,
    stockMap.value,
    Object.fromEntries(rawProducts.value.map((r) => [r.rawproductid, r.unit])),
  );
  if (shortages.length === 0) return "available";
  // Check if any ingredient is completely zero
  const hasZero = shortages.some((s) => s.available <= 0);
  return hasZero ? "oos" : "low";
}

const filteredGrouped = computed(() => {
  let list = [...menuItems.value];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((i) => i.ProductName?.toLowerCase().includes(q));
  }
  if (filterCategory.value)
    list = list.filter((i) => i.Category === filterCategory.value);
  if (filterStock.value) {
    list = list.filter((i) => {
      const s = getStockStatus(i);
      if (filterStock.value === "no_recipe") return i._recipeCount === 0;
      if (filterStock.value === "oos") return s === "oos";
      if (filterStock.value === "low") return s === "low";
      if (filterStock.value === "available") return s === "available";
      return true;
    });
  }
  return list.reduce((acc, i) => {
    const cat = i.Category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(i);
    return acc;
  }, {});
});

const allRecipeCategories = computed(() =>
  [
    ...new Set(allRecipesSummary.value.map((r) => r.Category).filter(Boolean)),
  ].sort(),
);
const allRecipesByCategory = computed(() =>
  allRecipesSummary.value.reduce((acc, row) => {
    const cat = row.Category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {}),
);
const filteredRecipePanel = computed(() => {
  const catItems = allRecipesByCategory.value[activeRecipeCategory.value] ?? [];
  if (!recipeSearch.value) return catItems;
  const q = recipeSearch.value.toLowerCase();
  return catItems.filter((r) => r.ProductName?.toLowerCase().includes(q));
});

// Stock preview for the open recipe modal
const recipeStockPreview = computed(() => {
  if (!activeItem.value || recipeRows.value.length === 0) return [];
  const invUnitMap = Object.fromEntries(
    rawProducts.value.map((r) => [r.rawproductid, r.unit]),
  );
  const fakeRecipes = recipeRows.value
    .filter((r) => r.rawproductid && r.quantityneeded > 0)
    .map((r) => ({
      finishedproductid: activeItem.value.ProductId,
      rawproductid: r.rawproductid,
      quantityneeded: r.quantityneeded,
      unit: r.unit,
      rawproduct: rawProducts.value.find(
        (rp) => rp.rawproductid === r.rawproductid,
      ),
    }));
  return checkStockForProduct(
    activeItem.value.ProductId,
    1,
    fakeRecipes,
    stockMap.value,
    invUnitMap,
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
const fetchRawProducts = async () => {
  const cached = loadCache(CACHE_KEY_RAW);
  if (cached) {
    rawProducts.value = cached;
    return;
  }
  const { data } = await supabase
    .from("rawproduct")
    .select("rawproductid, name, unit, reorderlevel, status")
    .neq("status", "Archived")
    .order("name");
  if (data) {
    rawProducts.value = data;
    saveCache(CACHE_KEY_RAW, data, CACHE_TTL_RAW);
  }
};

const fetchStockMap = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_STOCK);
    if (cached) {
      stockMap.value = cached;
      return;
    }
  }
  const { data: txns } = await supabase
    .from("rawproducttransaction")
    .select("rawproductid, transactiontype, quantity")
    .gt("quantity", 0);
  if (!txns) return;
  const m = {};
  for (const t of txns) {
    const d = t.transactiontype === "in" ? t.quantity : -t.quantity;
    m[t.rawproductid] = (m[t.rawproductid] ?? 0) + d;
  }
  stockMap.value = m;
  saveCache(CACHE_KEY_STOCK, stockMap.value, CACHE_TTL_STOCK);
};

const fetchAllRecipes = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_RECIPES);
    if (cached) {
      allRecipes.value = cached;
      return;
    }
  }
  const { data } = await supabase
    .from("recipe")
    .select(
      `
      recipeid, finishedproductid, rawproductid, quantityneeded, unit,
      rawproduct!inner ( rawproductid, name, unit, status )
    `,
    )
    .neq("rawproduct.status", "Archived");
  allRecipes.value = (data ?? []).map((r) => ({
    ...r,
    rawproduct: r.rawproduct,
  }));
  saveCache(CACHE_KEY_RECIPES, allRecipes.value, CACHE_TTL_RECIPES);
};

const fetchMenuItems = async (force = false) => {
  // Check cache BEFORE setting loading = true to avoid flash
  if (!force) {
    const cached = loadCache(CACHE_KEY_MENU);
    if (cached) {
      menuItems.value = cached;
      return;
    }
  }

  loading.value = true;
  const { data: products, error } = await supabase
    .from("product")
    .select(
      "ProductId, ProductName, ProductType, Category, Price, size_prices, image_url, Status",
    )
    .neq("Status", "Archived")
    .order("Category")
    .order("ProductName");

  if (error) {
    loading.value = false;
    return;
  }

  const { data: recipes } = await supabase
    .from("recipe")
    .select("finishedproductid");
  const recipeCounts = {};
  (recipes ?? []).forEach((r) => {
    recipeCounts[r.finishedproductid] =
      (recipeCounts[r.finishedproductid] || 0) + 1;
  });

  const invUnitMap = Object.fromEntries(
    rawProducts.value.map((r) => [r.rawproductid, r.unit]),
  );
  menuItems.value = (products ?? []).map((p) => {
    const count = recipeCounts[p.ProductId] ?? 0;
    const stockDetail =
      count > 0
        ? checkStockForProduct(
            p.ProductId,
            1,
            allRecipes.value,
            stockMap.value,
            invUnitMap,
          )
        : null;
    return { ...p, _recipeCount: count, _stockDetail: stockDetail };
  });
  saveCache(CACHE_KEY_MENU, menuItems.value, CACHE_TTL_MENU);
  loading.value = false;
};

// ─── Recipe modal helpers ─────────────────────────────────────────────────────
const onRawProductChange = (ing) => {
  // Auto-fill unit from inventory
  if (ing.rawproductid) {
    ing.unit = suggestRecipeUnit(ing.rawproductid, rawProducts.value);
  }
};

const addIngredientRow = () => {
  recipeRows.value.push({ rawproductid: null, quantityneeded: 0, unit: "g" });
};

// ─── Product CRUD ─────────────────────────────────────────────────────────────
const onCategoryChange = () => {
  if (getSizeType(form.value.Category) !== "none") {
    const newSizePrices = {};
    getSizeLabels(form.value.Category).forEach((s) => {
      newSizePrices[s] = null;
    });
    form.value.sizePrices = newSizePrices;
  } else {
    form.value.sizePrices = {};
  }
};

const openAddModal = () => {
  isEditing.value = false;
  editingId.value = null;
  form.value = {
    ProductName: "",
    Category: "",
    Price: null,
    sizePrices: {},
    image_url: null,
  };
  showModal.value = true;
};

const openEditModal = async (item) => {
  isEditing.value = true;
  editingId.value = item.ProductId;
  form.value = {
    ProductName: item.ProductName,
    Category: item.Category ?? "",
    Price: item.Price,
    sizePrices: item.size_prices || {},
  };
  showModal.value = true;
};

const uploadImage = async (file) => {
  const ext = file.name.split(".").pop();
  const path = `products/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
};

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    form.value.image_url = await uploadImage(file);
  } catch (err) {
    alert("Image upload failed: " + err.message);
  }
};

const closeModal = () => {
  showModal.value = false;
};

const saveItem = async () => {
  if (!form.value.ProductName) {
    alert("Product name is required.");
    return;
  }
  if (!form.value.Category) {
    alert("Please select a category.");
    return;
  }
  const sizeLabels = getSizeLabels(form.value.Category);
  if (sizeLabels.length > 0) {
    for (const size of sizeLabels) {
      if (!form.value.sizePrices[size] || form.value.sizePrices[size] <= 0) {
        alert(`Please enter a price for ${size}`);
        return;
      }
    }
  }
  saving.value = true;
  const payload = {
    ProductName: form.value.ProductName,
    ProductType: "finished",
    Category: form.value.Category,
    Price: sizeLabels.length > 0 ? null : (form.value.Price ?? null),
    size_prices: sizeLabels.length > 0 ? form.value.sizePrices : null,
    image_url: form.value.image_url ?? null,
  };
  let error;
  if (isEditing.value) {
    const { error: e } = await supabase
      .from("product")
      .update(payload)
      .eq("ProductId", editingId.value);
    error = e;
  } else {
    const { error: e } = await supabase.from("product").insert(payload);
    error = e;
  }
  if (error) {
    alert("Failed to save: " + error.message);
  } else {
    sessionStorage.removeItem(CACHE_KEY_MENU);
    sessionStorage.removeItem(CACHE_KEY_RECIPES);
    await Promise.all([fetchAllRecipes(true), fetchMenuItems(true)]);
    closeModal();
  }
  saving.value = false;
};

const showDeleteModal = ref(false);
const deleteTarget = ref(null);

const deleteItem = (id) => {
  const item = menuItems.value.find((i) => i.ProductId === id);
  deleteTarget.value = item;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!deleteTarget.value) return;
  const currentUser = localStorage.getItem("username") || "Unknown";
  const { error } = await supabase
    .from("product")
    .update({
      Status: "Archived",
      ArchivedAt: new Date().toISOString(),
      ArchivedBy: currentUser,
    })
    .eq("ProductId", deleteTarget.value.ProductId);
  if (error) {
    alert("Failed to archive: " + error.message);
  } else {
    sessionStorage.removeItem(CACHE_KEY_MENU);
    await fetchMenuItems(true);
  }
  showDeleteModal.value = false;
  deleteTarget.value = null;
};

// ─── Recipe CRUD ──────────────────────────────────────────────────────────────
const openRecipeModal = async (item) => {
  activeItem.value = item;
  recipeRows.value = [];
  loadingRecipe.value = true;
  showRecipeModal.value = true;
  const { data, error } = await supabase
    .from("recipe")
    .select("recipeid, rawproductid, quantityneeded, unit")
    .eq("finishedproductid", item.ProductId)
    .order("rawproductid");
  loadingRecipe.value = false;
  if (!error && data && data.length > 0) {
    recipeRows.value = data.map((r) => ({
      rawproductid: r.rawproductid,
      quantityneeded: r.quantityneeded,
      unit: r.unit ?? suggestRecipeUnit(r.rawproductid, rawProducts.value),
    }));
  } else {
    recipeRows.value = [{ rawproductid: null, quantityneeded: 0, unit: "g" }];
  }
};

const closeRecipeModal = () => {
  showRecipeModal.value = false;
  activeItem.value = null;
};

const saveRecipe = async () => {
  if (!activeItem.value) return;
  const validRows = recipeRows.value.filter(
    (r) => r.rawproductid && r.quantityneeded > 0,
  );
  if (validRows.length === 0) {
    alert("Please add at least one ingredient with a valid quantity.");
    return;
  }
  savingRecipe.value = true;
  const { error: delErr } = await supabase
    .from("recipe")
    .delete()
    .eq("finishedproductid", activeItem.value.ProductId);
  if (delErr) {
    alert("Failed to update recipe: " + delErr.message);
    savingRecipe.value = false;
    return;
  }
  const inserts = validRows.map((r) => ({
    finishedproductid: activeItem.value.ProductId,
    rawproductid: r.rawproductid,
    quantityneeded: r.quantityneeded,
    unit: r.unit,
  }));
  const { error: insErr } = await supabase.from("recipe").insert(inserts);
  if (insErr) {
    alert("Failed to save recipe: " + insErr.message);
  } else {
    sessionStorage.removeItem(CACHE_KEY_MENU);
    sessionStorage.removeItem(CACHE_KEY_RECIPES);
    await Promise.all([fetchAllRecipes(true), fetchMenuItems(true)]);
    closeRecipeModal();
  }
  savingRecipe.value = false;
};

// ─── All Recipes ──────────────────────────────────────────────────────────────
const openAllRecipes = async () => {
  showAllRecipesModal.value = true;
  loadingAllRecipes.value = true;
  recipeSearch.value = "";
  expandedRecipe.value = null;
  const { data: recipes } = await supabase
    .from("recipe")
    .select("recipeid, finishedproductid, rawproductid, quantityneeded, unit");
  const { data: raws } = await supabase
    .from("rawproduct")
    .select("rawproductid, name, unit");
  const rawMap = {};
  (raws ?? []).forEach((r) => {
    rawMap[r.rawproductid] = r;
  });
  const productIds = [
    ...new Set((recipes ?? []).map((r) => r.finishedproductid)),
  ];
  if (productIds.length === 0) {
    allRecipesSummary.value = [];
    loadingAllRecipes.value = false;
    return;
  }
  const { data: products } = await supabase
    .from("product")
    .select("ProductId, ProductName, Category, Price")
    .in("ProductId", productIds)
    .order("Category")
    .order("ProductName");
  allRecipesSummary.value = (products ?? []).map((p) => ({
    ...p,
    recipes: (recipes ?? [])
      .filter((r) => r.finishedproductid === p.ProductId)
      .map((r) => ({
        ...r,
        rawName: rawMap[r.rawproductid]?.name ?? "—",
        rawUnit: rawMap[r.rawproductid]?.unit ?? "",
      })),
  }));
  if (allRecipeCategories.value.length > 0)
    activeRecipeCategory.value = allRecipeCategories.value[0];
  loadingAllRecipes.value = false;
};

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await fetchRawProducts();
  await Promise.all([fetchStockMap(), fetchAllRecipes()]);
  await fetchMenuItems();
  const editId = route.query.edit;
  if (editId) {
    const item = menuItems.value.find((p) => String(p.ProductId) === editId);
    if (item) openEditModal(item);
  }
});
</script>

<style scoped>
.menu-module {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}

/* HEADER */
.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.header-main h1 {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0;
}
.header-main p {
  font-size: 14px;
  color: #888;
  margin: 4px 0 0;
}
.header-actions {
  display: flex;
  gap: 10px;
}
.recipe-all-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: white;
  border: 1px solid #ddd;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  color: #31201d;
  transition: 0.2s;
}
.recipe-all-btn:hover {
  border-color: #31201d;
}
.add-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #31201d;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: 0.2s;
}
.add-btn:hover {
  background: #4a3330;
}

.delete-divider {
  border: none;
  border-top: 1px solid #e9ecef;
  margin: 0;
}
.delete-body-text {
  font-size: 14px;
  color: #343a40;
  padding: 20px 0;
  margin: 0;
}
.delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 16px;
}
.btn-delete-cancel {
  background: #fff;
  border: 1px solid #dee2e6;
  color: #495057;
  border-radius: 8px;
  padding: 7px 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-delete-cancel:hover {
  background: #f8f9fa;
}
.btn-delete-confirm {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-delete-confirm:hover {
  background: #b91c1c;
}

/* LEGEND BAR */
.stock-legend-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border: 1px solid #eee;
  border-radius: 9px;
  padding: 9px 14px;
  margin-bottom: 16px;
  font-size: 12px;
  flex-wrap: wrap;
}
.leg-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #555;
  font-weight: 600;
}
.leg-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.leg-dot.oos {
  background: #dc2626;
}
.leg-dot.low {
  background: #f59e0b;
}
.leg-dot.recipe-ok {
  background: #16a34a;
}
.leg-dot.no-recipe {
  background: #d1d5db;
  border: 1px dashed #9ca3af;
}
.leg-sep {
  color: #ddd;
}
.leg-note {
  color: #aaa;
  font-weight: 400;
}

/* FILTERS */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
  background: white;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #eee;
  flex-wrap: wrap;
  align-items: center;
}
.search-input {
  flex: 1;
  min-width: 180px;
  position: relative;
  display: flex;
  align-items: center;
}
.search-input input {
  width: 100%;
  padding: 9px 12px 9px 36px;
  border: 1px solid #eee;
  background: #fafafa;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
}
.search-input svg {
  position: absolute;
  left: 10px;
  color: #999;
}
.select-wrap {
  position: relative;
}
.select-wrap.full {
  max-width: 100%;
}
.filter-sel {
  appearance: none;
  padding: 9px 32px 9px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  outline: none;
  cursor: pointer;
  min-width: 150px;
}
.filter-sel:focus {
  border-color: #31201d;
}
.sel-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
}

/* LOADING / EMPTY */
.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  padding: 60px;
  color: #999;
  font-size: 14px;
}
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #eee;
  border-top-color: #31201d;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.empty-state {
  text-align: center;
  padding: 60px;
  color: #bbb;
  font-size: 15px;
}

/* SECTION */
.menu-section {
  margin-bottom: 32px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #888;
  margin-bottom: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
}
.count-chip {
  background: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 20px;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}
.section-oos-warn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  text-transform: none;
  letter-spacing: 0;
}

/* GRID */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

/* CARD */
.menu-card {
  background: white;
  border: 1.5px solid #eee;
  border-radius: 14px;
  padding: 0;
  transition: box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
}
.menu-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
.menu-card.stock-oos {
  border-color: #fca5a5;
  background: #fff5f5;
}
.menu-card.stock-low {
  border-color: #fcd34d;
}
.menu-card.no-recipe-card {
  border-style: dashed;
  border-color: #d1d5db;
}

/* STOCK RIBBON */
.stock-ribbon {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
}
.stock-ribbon span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ribbon-available {
  background: #d1fae5;
  color: #065f46;
}
.ribbon-low {
  background: #fef3c7;
  color: #92400e;
}
.ribbon-oos {
  background: #fee2e2;
  color: #991b1b;
}
.ribbon-no_recipe {
  background: #f3f4f6;
  color: #6b7280;
}

/* CARD BODY */
.card-image {
  width: 100%;
  height: 120px;
  background: #f5f0eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-image.placeholder {
  color: #d4b896;
}
.card-body {
  padding: 0 14px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.item-icon {
  color: #c49a6c;
  flex-shrink: 0;
}
.name-row h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #31201d;
}
.size-prices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.size-price-tag {
  font-size: 13px;
  font-weight: 600;
  color: #6a9c7a;
  background: #f0faf3;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #c8e6d0;
}

/* STOCK DETAIL */
.stock-detail-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.shortage-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  background: #fee2e2;
  color: #dc2626;
  padding: 2px 7px;
  border-radius: 4px;
}

/* RECIPE BUTTON */
.recipe-status-area {
  padding: 0 14px;
}
.recipe-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}
.recipe-btn.view {
  border: 1px solid #c49a6c;
  background: #fff9f0;
  color: #c49a6c;
}
.recipe-btn.view:hover {
  background: #fff0dc;
}
.recipe-btn.add {
  border: 1.5px dashed #e5e7eb;
  background: #f9fafb;
  color: #9ca3af;
}
.recipe-btn.add:hover {
  border-color: #c49a6c;
  color: #c49a6c;
  background: #fff9f0;
}

/* PRICE ROW */
.price-action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f5f5f5;
  padding: 10px 14px;
}
.price {
  font-size: 18px;
  font-weight: 800;
  color: #31201d;
}
.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.icon-btn {
  border: 1px solid #eee;
  background: white;
  padding: 6px;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}
.icon-btn.edit:hover {
  border-color: #31201d;
  color: #31201d;
}
.icon-btn.delete:hover {
  border-color: #dc2626;
  color: #dc2626;
  background: #fee2e2;
}

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
.modal-content {
  background: white;
  width: 500px;
  max-width: 95vw;
  border-radius: 16px;
  padding: 28px 32px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  max-height: 92vh;
  overflow-y: auto;
}
.modal-content.recipe-modal {
  width: 640px;
}
.modal-hdr {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.modal-hdr h3 {
  font-size: 18px;
  font-weight: 700;
  color: #31201d;
  margin: 0 0 3px;
}
.modal-hdr p {
  font-size: 13px;
  color: #888;
  margin: 0;
}
.unit-hint {
  color: #0369a1;
}
.close-x-btn {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: 0.2s;
  flex-shrink: 0;
}
.close-x-btn:hover {
  background: #f5f5f5;
  color: #31201d;
}

/* FORM */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 12px;
  font-weight: 700;
  color: #31201d;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field input {
  padding: 10px 13px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fafafa;
  outline: none;
  font-size: 14px;
  transition: 0.2s;
}
.field input:focus {
  border-color: #c49a6c;
  background: white;
}
.select-wrap.full select {
  width: 100%;
  appearance: none;
  padding: 10px 32px 10px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  background: #fafafa;
  outline: none;
  cursor: pointer;
}
.select-wrap.full select:focus {
  border-color: #c49a6c;
}
.submit-full {
  width: 100%;
  background: #31201d;
  color: white;
  border: none;
  padding: 13px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 15px;
  margin-top: 20px;
  cursor: pointer;
  transition: 0.2s;
}
.submit-full:hover:not(:disabled) {
  background: #4a3330;
}
.submit-full:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* SIZE PRICES */
.sizes-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}
.size-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f9f4ef;
  border-radius: 8px;
}
.size-name {
  font-weight: 700;
  color: #31201d;
  font-size: 14px;
}
.size-price-input {
  display: flex;
  align-items: center;
  gap: 5px;
}
.size-price-input .currency {
  font-weight: 600;
  color: #31201d;
}
.size-price-input input {
  width: 120px;
  padding: 8px 10px;
  border: 1px solid #e8e0d5;
  border-radius: 6px;
  font-size: 14px;
  text-align: right;
}
.preview-img {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
}
.upload-label {
  display: inline-block;
  padding: 8px 16px;
  background: #f5f0eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #31201d;
}
.upload-label:hover {
  background: #ede5d8;
}

/* RECIPE STOCK PREVIEW */
.recipe-stock-preview {
  background: #fff5f5;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.rsp-header {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: #dc2626;
  margin-bottom: 8px;
}
.rsp-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid #fee2e2;
}
.rsp-row:last-child {
  border-bottom: none;
}
.rsp-name {
  font-weight: 600;
  color: #31201d;
}
.rsp-detail {
  color: #dc2626;
  font-weight: 600;
}
.recipe-stock-ok {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #d1fae5;
  color: #065f46;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 13px;
  border-radius: 8px;
  margin-bottom: 14px;
}

/* INGREDIENT TABLE */
.ingredient-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 32px;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 2px;
}
.ingredient-header label {
  font-size: 11px;
  font-weight: 700;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 4px;
}
.unit-auto-tag {
  background: #0369a1;
  color: white;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: none;
  letter-spacing: 0;
}
.ingredient-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 2px;
}
.ingredient-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 32px;
  gap: 8px;
  margin-bottom: 10px;
  align-items: start;
}
.ingredient-row input {
  width: 100%;
  height: 40px;
  padding: 0 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fafafa;
  font-size: 14px;
  outline: none;
  transition: 0.2s;
  box-sizing: border-box;
}
.ingredient-row input:focus {
  border-color: #c49a6c;
  background: white;
}
.ingredient-row .select-wrap.full select {
  height: 40px;
  padding: 0 24px 0 8px;
  font-size: 13px;
}
.unit-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.convert-hint {
  font-size: 10px;
  color: #0369a1;
  font-weight: 600;
  padding: 0 2px;
}
.stock-col {
  display: flex;
  align-items: flex-start;
  padding-top: 10px;
}
.ing-stock {
  font-size: 11px;
  font-weight: 700;
}
.ing-stock.ok {
  color: #16a34a;
}
.ing-stock.warn {
  color: #d97706;
}
.ing-stock.danger {
  color: #dc2626;
}
.ing-stock.neutral {
  color: #888;
}
.ing-stock-na {
  font-size: 11px;
  color: #ccc;
  padding-top: 10px;
}
.remove-ing {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border-radius: 6px;
  transition: 0.2s;
}
.remove-ing:hover {
  background: #fee2e2;
}
.add-ing-btn {
  margin-top: 10px;
  background: none;
  border: 1px dashed #c49a6c;
  color: #c49a6c;
  width: 100%;
  padding: 11px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: 0.2s;
}
.add-ing-btn:hover {
  background: #fff9f0;
}
.empty-recipe {
  text-align: center;
  color: #bbb;
  padding: 20px;
  font-size: 14px;
}
.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
  padding-top: 18px;
}
.cancel-btn {
  background: #f5f5f5;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
.submit-full-sm {
  background: #31201d;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.2s;
}
.submit-full-sm:hover:not(:disabled) {
  background: #4a3330;
}
.submit-full-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ALL RECIPES MODAL */
.modal-content.all-recipes-modal {
  width: 780px;
  max-width: 95vw;
  padding: 28px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 88vh;
}
.modal-content.all-recipes-modal .modal-hdr {
  padding: 0 28px 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 0;
}
.all-recipes-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.recipe-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
  overflow-y: auto;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.cat-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  text-align: left;
  transition: 0.15s;
  gap: 8px;
}
.cat-tab:hover {
  background: #f5f5f5;
  color: #31201d;
}
.cat-tab.active {
  background: #fff9f0;
  color: #31201d;
  font-weight: 700;
}
.cat-tab-name {
  flex: 1;
}
.cat-tab-count {
  font-size: 11px;
  font-weight: 700;
  background: #f0f0f0;
  color: #888;
  padding: 1px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}
.cat-tab.active .cat-tab-count {
  background: #c49a6c22;
  color: #c49a6c;
}
.recipe-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.recipe-search {
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.recipe-search svg {
  color: #bbb;
  flex-shrink: 0;
}
.recipe-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: none;
  color: #31201d;
}
.recipe-panel-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.recipe-card {
  border: 1px solid #eee;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.recipe-card:hover {
  border-color: #c49a6c44;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.recipe-card.expanded {
  border-color: #c49a6c;
}
.recipe-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: white;
  gap: 10px;
}
.recipe-card-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.recipe-card-name {
  font-size: 13px;
  font-weight: 600;
  color: #31201d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recipe-ing-pill {
  font-size: 11px;
  font-weight: 600;
  background: #f0f0f0;
  color: #888;
  padding: 2px 7px;
  border-radius: 10px;
  flex-shrink: 0;
}
.recipe-card.expanded .recipe-ing-pill {
  background: #c49a6c22;
  color: #c49a6c;
}
.recipe-card-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.recipe-card-price {
  font-size: 13px;
  font-weight: 700;
  color: #31201d;
}
.expand-icon {
  color: #bbb;
  transition: transform 0.2s;
}
.expand-icon.rotated {
  transform: rotate(180deg);
  color: #c49a6c;
}
.recipe-card-body {
  padding: 0 14px 12px;
  background: #fdfaf7;
  border-top: 1px solid #f5ede0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ing-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid #f0ebe0;
  font-size: 12px;
}
.ing-row:last-child {
  border-bottom: none;
}
.ing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c49a6c;
  flex-shrink: 0;
}
.ing-name {
  flex: 1;
  color: #444;
  font-weight: 500;
}
.ing-qty {
  color: #c49a6c;
  font-weight: 600;
  font-size: 11px;
  background: #fff;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid #f0e0c8;
}
.ing-inv-unit {
  font-size: 10px;
  color: #0369a1;
  font-weight: 600;
  background: #dbeafe;
  padding: 1px 5px;
  border-radius: 3px;
}

@media (max-width: 1024px) {
  .menu-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .menu-grid {
    grid-template-columns: 1fr;
  }
  .all-recipes-layout {
    flex-direction: column;
  }
  .recipe-sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
  }
}
</style>

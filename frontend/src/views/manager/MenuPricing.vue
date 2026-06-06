<template>
  <div class="menu-module">
    <header class="module-header">
      <div class="header-main">
        <h1>Menu & Pricing</h1>
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
      </h3>
      <div class="menu-grid">
        <div
          class="menu-card"
          v-for="item in items"
          :key="item.ProductId"
          :class="{ 'item-disabled': item._disabled }"
        >
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
            <!-- Show size prices if available -->
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
          </div>

          <div class="recipe-status-area">
            <button
              v-if="item._recipeCount > 0"
              class="recipe-btn view"
              @click="openRecipeModal(item)"
            >
              <ChefHat :size="13" /> Recipe ({{ item._recipeCount }}
              ingredients)
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

    <!-- ADD / EDIT PRODUCT MODAL -->
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
          <!--upload pics here-->
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

          <!-- Size Prices Section (shown only for categories with sizes) -->
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

          <!-- Base Price (for items without sizes) -->
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

    <!-- RECIPE MODAL -->
    <div
      v-if="showRecipeModal"
      class="modal-overlay"
      @click.self="closeRecipeModal"
    >
      <div class="modal-content recipe-modal">
        <header class="modal-hdr">
          <div>
            <h3>Recipe: {{ activeItem?.ProductName }}</h3>
            <p>Raw materials and quantities needed to make this product</p>
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
                    <option
                      v-for="rp in rawProducts"
                      :key="rp.rawproductid"
                      :value="rp.rawproductid"
                    >
                      {{ rp.name }}
                    </option>
                  </select>
                  <ChevronDown :size="12" class="sel-icon" />
                </div>
              </div>
              <div class="field-item">
                <input
                  v-model.number="ing.quantityneeded"
                  type="number"
                  min="0"
                  placeholder="0"
                />
              </div>
              <div class="field-item">
                <div class="select-wrap full">
                  <select v-model="ing.unit">
                    <option
                      v-for="u in [
                        'g',
                        'kg',
                        'ml',
                        'l',
                        'pcs',
                        'oz',
                        'tbsp',
                        'tsp',
                      ]"
                      :key="u"
                    >
                      {{ u }}
                    </option>
                  </select>
                  <ChevronDown :size="12" class="sel-icon" />
                </div>
              </div>
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

          <button
            class="add-ing-btn"
            @click="
              recipeRows.push({
                rawproductid: null,
                quantityneeded: 0,
                unit: 'g',
              })
            "
          >
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

    <!-- ALL RECIPES MODAL -->
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
} from "lucide-vue-next";
import { supabase } from "@/supabase";

const route = useRoute();

// ─── Cache ────────────────────────────────────────────────────────────────────
const CACHE_KEY_MENU = "cache_menu_items";
const CACHE_KEY_RAW = "cache_raw_products";
const CACHE_TTL = 30 * 60 * 1000;

const saveCache = (key, data) => {
  sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};

const loadCache = (key) => {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (Date.now() - parsed.timestamp > CACHE_TTL) {
    sessionStorage.removeItem(key);
    return null;
  }
  return parsed.data;
};

// ─── Size Helper Functions ────────────────────────────────────────────────────
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

// ─── State ────────────────────────────────────────────────────────────────────
const menuItems = ref([]);
const rawProducts = ref([]);
const loading = ref(false);

const searchQuery = ref("");
const filterCategory = ref("");

// Product modal
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

// Recipe modal
const showRecipeModal = ref(false);
const loadingRecipe = ref(false);
const activeItem = ref(null);
const recipeRows = ref([]);
const savingRecipe = ref(false);

// All recipes modal
const showAllRecipesModal = ref(false);
const allRecipesSummary = ref([]);
const loadingAllRecipes = ref(false);
const activeRecipeCategory = ref("");
const recipeSearch = ref("");
const expandedRecipe = ref(null);

// ─── Computed ─────────────────────────────────────────────────────────────────
const categories = computed(() => {
  const cats = menuItems.value.map((i) => i.Category).filter(Boolean);
  return [...new Set(cats)].sort();
});

const filteredGrouped = computed(() => {
  let list = [...menuItems.value];
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((i) => i.ProductName?.toLowerCase().includes(q));
  }
  if (filterCategory.value)
    list = list.filter((i) => i.Category === filterCategory.value);

  return list.reduce((acc, i) => {
    const cat = i.Category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(i);
    return acc;
  }, {});
});

const allRecipeCategories = computed(() => {
  const cats = allRecipesSummary.value.map((r) => r.Category).filter(Boolean);
  return [...new Set(cats)].sort();
});

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

// ─── Fetch ────────────────────────────────────────────────────────────────────
const fetchRawProducts = async () => {
  const cached = loadCache(CACHE_KEY_RAW);
  if (cached) {
    rawProducts.value = cached;
    return;
  }

  const { data, error } = await supabase
    .from("rawproduct")
    .select(
      "rawproductid, name, category, unit, reorderlevel, stockquantity, expirationdate",
    )
    .order("name");
  if (error) console.error("fetchRawProducts error:", error.message);
  if (data) {
    rawProducts.value = data;
    saveCache(CACHE_KEY_RAW, data);
  }
};

const fetchMenuItems = async (force = false) => {
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
      "ProductId, ProductName, ProductType, Category, Price, size_prices, image_url, CreatedAt, Status",
    )
    .neq("Status", "Archived")
    .order("Category")
    .order("ProductName");

  if (error) {
    console.error(error.message);
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

  menuItems.value = (products ?? []).map((p) => ({ ...p }));
  saveCache(CACHE_KEY_MENU, menuItems.value); // add this before loading.value = false
  loading.value = false;
};

// ─── Product CRUD ─────────────────────────────────────────────────────────────
const onCategoryChange = () => {
  // Reset size prices when category changes
  if (getSizeType(form.value.Category) !== "none") {
    const sizeLabels = getSizeLabels(form.value.Category);
    const newSizePrices = {};
    sizeLabels.forEach((size) => {
      newSizePrices[size] = null;
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

  // Validate size prices if category has sizes
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
    const { error: updateError } = await supabase
      .from("product")
      .update(payload)
      .eq("ProductId", editingId.value);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("product")
      .insert(payload);
    error = insertError;
  }

  if (error) {
    alert("Failed to save: " + error.message);
  } else {
    sessionStorage.removeItem(CACHE_KEY_MENU);
    await fetchMenuItems(true);
    closeModal();
  }
  saving.value = false;
};

const deleteItem = async (id) => {
  if (
    !confirm("Archive this product? It can be restored from Backup & Restore.")
  )
    return;

  const currentUser = localStorage.getItem("username") || "Unknown";
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("product")
    .update({ Status: "Archived", ArchivedAt: now, ArchivedBy: currentUser })
    .eq("ProductId", id);

  if (error) {
    alert("Failed to archive: " + error.message);
  } else {
    sessionStorage.removeItem(CACHE_KEY_MENU);
    await fetchMenuItems(true);
  }
};

// ─── Recipe CRUD ──────────────────────────────────────────────────────────────
const openRecipeModal = async (item) => {
  activeItem.value = item;
  recipeRows.value = [];
  loadingRecipe.value = true;
  showRecipeModal.value = true;

  const { data, error } = await supabase
    .from("recipe")
    .select("recipeid, finishedproductid, rawproductid, quantityneeded, unit")
    .eq("finishedproductid", item.ProductId)
    .order("rawproductid");

  loadingRecipe.value = false;

  if (!error && data && data.length > 0) {
    recipeRows.value = data.map((r) => ({
      rawproductid: r.rawproductid,
      quantityneeded: r.quantityneeded,
      unit: r.unit ?? "g",
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

  const { error: delError } = await supabase
    .from("recipe")
    .delete()
    .eq("finishedproductid", activeItem.value.ProductId);

  if (delError) {
    alert("Failed to update recipe: " + delError.message);
    savingRecipe.value = false;
    return;
  }

  const inserts = validRows.map((r) => ({
    finishedproductid: activeItem.value.ProductId,
    rawproductid: r.rawproductid,
    quantityneeded: r.quantityneeded,
    unit: r.unit,
  }));

  const { error: insError } = await supabase.from("recipe").insert(inserts);

  if (insError) {
    alert("Failed to save recipe: " + insError.message);
  } else {
    sessionStorage.removeItem(CACHE_KEY_MENU); 
    await fetchMenuItems(true); 
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

  const { data: recipes, error: recipeErr } = await supabase
    .from("recipe")
    .select("recipeid, finishedproductid, rawproductid, quantityneeded, unit");

  if (recipeErr) {
    console.error(recipeErr.message);
    loadingAllRecipes.value = false;
    return;
  }

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

  if (allRecipeCategories.value.length > 0) {
    activeRecipeCategory.value = allRecipeCategories.value[0];
  }

  loadingAllRecipes.value = false;
};

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchRawProducts(), fetchMenuItems()]);

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
  margin-bottom: 24px;
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
  transition: border-color 0.2s;
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

/* MENU SECTION */
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

/* GRID */
.menu-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

/* CARD */
.menu-card {
  background: white;
  border: 1px solid #eee;
  border-radius: 14px;
  padding: 18px 20px;
  transition: box-shadow 0.2s;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.menu-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
.item-disabled {
  opacity: 0.45;
  filter: grayscale(0.6);
}

.card-image {
  width: 100%;
  height: 130px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f0eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-image.placeholder {
  color: #d4b896;
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
  transition: 0.2s;
}
.upload-label:hover {
  background: #ede5d8;
}

.card-top {
  display: flex;
  align-items: center;
  gap: 7px;
}
.cat-label {
  font-size: 12px;
  font-weight: 700;
  color: #c49a6c;
  background: #fff9f0;
  padding: 2px 8px;
  border-radius: 4px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 3px;
}
.item-icon {
  color: #c49a6c;
  flex-shrink: 0;
}
.name-row h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #31201d;
}

/* Size prices display on card */
.size-prices {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.size-price-tag {
  font-size: 16px;
  font-weight: 600;
  color: #6a9c7a;
  background: #f0faf3;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #c8e6d0;
}

/* RECIPE BUTTON */
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
  border: 1px dashed #ddd;
  background: #fafafa;
  color: #bbb;
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
  padding-top: 12px;
  margin-top: 2px;
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

/* MODAL BASE */
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
  width: 580px;
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

/* Size Prices Styles */
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
.size-price-input input:focus {
  outline: none;
  border-color: #c49a6c;
}

/* RECIPE BODY */
.recipe-body {
  margin-bottom: 16px;
}
.ingredient-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 36px;
  gap: 10px;
  margin-bottom: 8px;
  padding: 0 2px;
}
.ingredient-header label {
  font-size: 11px;
  font-weight: 700;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ingredient-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 2px;
}
.ingredient-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 36px;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}
.ingredient-row input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
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
  padding: 0 28px 0 10px;
}
.remove-ing {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
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
.recipe-search input::placeholder {
  color: #ccc;
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

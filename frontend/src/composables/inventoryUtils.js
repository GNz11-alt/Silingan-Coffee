/**
 * inventoryUtils.js
 * Shared utilities for Silingan POS — unit conversion, FEFO stock deduction,
 * stock availability checks, and recipe-based OOS detection.
 *
 * Import this in InventoryManagement.vue, MenuManagement.vue, and POSTerminal.vue
 *   import { convertToBase, canConvert, computeNetStock, checkStockForProduct,
 *            deductFEFO } from '@/inventoryUtils.js'
 */

// ─── UNIT CONVERSION ──────────────────────────────────────────────────────────

/**
 * All base units and their conversion factors to the canonical "base" unit.
 * Weight base  → grams (g)
 * Volume base  → millilitres (ml)
 * Count base   → pieces (pcs)
 */
const UNIT_GROUPS = {
  weight: { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 },
  volume: { ml: 1, l: 1000, tsp: 4.92892, tbsp: 14.7868, 'fl_oz': 29.5735, cup: 240 },
  count:  { pcs: 1 },
}

/**
 * Returns the canonical base unit for a given unit string.
 *   getBaseUnit('kg') → 'g'
 *   getBaseUnit('l')  → 'ml'
 *   getBaseUnit('pcs') → 'pcs'
 */
export function getBaseUnit(unit) {
  if (!unit) return null
  const u = unit.toLowerCase().trim()
  for (const [, map] of Object.entries(UNIT_GROUPS)) {
    if (u in map) {
      const keys = Object.keys(map)
      return keys[0] // first key is the base
    }
  }
  return unit // unknown — return as-is
}

/**
 * Returns the conversion factor for a unit relative to its group base.
 *   factorToBase('kg') → 1000   (1 kg = 1000 g)
 *   factorToBase('g')  → 1
 *   factorToBase('l')  → 1000
 */
export function factorToBase(unit) {
  if (!unit) return 1
  const u = unit.toLowerCase().trim()
  for (const [, map] of Object.entries(UNIT_GROUPS)) {
    if (u in map) return map[u]
  }
  return 1 // unknown unit — treat as 1:1
}

/**
 * Convert a quantity from `fromUnit` to `toUnit`.
 * Returns null if units are incompatible (different groups).
 *
 *   convertUnit(1, 'kg', 'g')   → 1000
 *   convertUnit(500, 'g', 'kg') → 0.5
 *   convertUnit(1, 'kg', 'ml')  → null  (incompatible)
 */
export function convertUnit(qty, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return qty
  const from = fromUnit.toLowerCase().trim()
  const to   = toUnit.toLowerCase().trim()
  if (from === to) return qty

  // Find which group both belong to
  for (const [, map] of Object.entries(UNIT_GROUPS)) {
    if (from in map && to in map) {
      return qty * (map[from] / map[to])
    }
  }
  return null // incompatible
}

/**
 * Returns true if fromUnit and toUnit are in the same measurement group.
 */
export function canConvert(fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return false
  const from = fromUnit.toLowerCase().trim()
  const to   = toUnit.toLowerCase().trim()
  if (from === to) return true
  for (const [, map] of Object.entries(UNIT_GROUPS)) {
    if (from in map && to in map) return true
  }
  return false
}

/**
 * Given a recipe's quantityneeded + recipe.unit, and the raw product's stock
 * unit (from rawproduct table), returns the needed quantity expressed in the
 * inventory's unit so we can compare apples-to-apples.
 *
 *   normaliseNeeded(15, 'g', 'kg') → 0.015
 *   normaliseNeeded(1, 'kg', 'g')  → 1000
 *   normaliseNeeded(2, 'pcs', 'pcs') → 2
 */
export function normaliseNeeded(recipeQty, recipeUnit, inventoryUnit) {
  const converted = convertUnit(recipeQty, recipeUnit, inventoryUnit)
  // If conversion fails (null), fall back to assuming same unit
  return converted ?? recipeQty
}

// ─── NET STOCK COMPUTATION ────────────────────────────────────────────────────

/**
 * Given an array of rawproducttransaction rows for ONE raw product,
 * compute net available stock.
 * Each row: { transactiontype: 'in'|'out', quantity: number }
 */
export function computeNetStock(transactions) {
  return transactions.reduce((sum, t) => {
    return sum + (t.transactiontype === 'in' ? (t.quantity ?? 0) : -(t.quantity ?? 0))
  }, 0)
}

// ─── STOCK AVAILABILITY CHECK ─────────────────────────────────────────────────

/**
 * Check whether a finished product can be made `orderQty` times given
 * current raw material stock.
 *
 * @param {number}   finishedProductId
 * @param {number}   orderQty            How many to make (default 1)
 * @param {Array}    recipes             All recipe rows (joined with rawproduct name+unit)
 *                                       Each: { finishedproductid, rawproductid, quantityneeded, unit,
 *                                               rawproduct: { name, unit } }
 * @param {Object}   stockMap            { [rawproductid]: availableQtyInInventoryUnit }
 * @param {Object}   inventoryUnitMap    { [rawproductid]: 'g'|'kg'|'ml'|... }
 *
 * @returns {Array}  Array of shortage objects (empty = can make it):
 *                   [{ rawproductid, name, needed, available, unit }]
 */
export function checkStockForProduct(finishedProductId, orderQty = 1, recipes, stockMap, inventoryUnitMap) {
  const relevant = recipes.filter(r => r.finishedproductid === finishedProductId)
  if (relevant.length === 0) return [] // no recipe = no restriction

  const shortages = []
  for (const recipe of relevant) {
    const invUnit  = inventoryUnitMap[recipe.rawproductid] ?? recipe.unit
    const needed   = normaliseNeeded(recipe.quantityneeded * orderQty, recipe.unit, invUnit)
    const available = stockMap[recipe.rawproductid] ?? 0

    if (available < needed) {
      shortages.push({
        rawproductid: recipe.rawproductid,
        name: recipe.rawproduct?.name ?? `Raw #${recipe.rawproductid}`,
        needed: +needed.toFixed(2),
        available: +available.toFixed(2),
        unit: invUnit,
      })
    }
  }
  return shortages
}

// ─── FEFO DEDUCTION ───────────────────────────────────────────────────────────

/**
 * Given the batches for one raw product (sorted earliest expiry first,
 * nulls last), deduct `totalQtyNeeded` following FEFO.
 *
 * Returns an array of { rawtransactionid, rawproductid, branchid, qtyToDeduct }
 * describing which batches to reduce and by how much.
 *
 * @param {Array}  batches          rawproducttransaction 'in' rows for one rawproductid,
 *                                  each with { rawtransactionid, rawproductid, branchid,
 *                                              quantity (remaining), expirationdate }
 * @param {number} totalQtyNeeded   In the same unit as batch.quantity
 */
export function planFEFODeduction(batches, totalQtyNeeded) {
  // Sort: earliest expiry first; no-expiry batches go last
  const sorted = [...batches].sort((a, b) => {
    if (!a.expirationdate && !b.expirationdate) return a.rawtransactionid - b.rawtransactionid
    if (!a.expirationdate) return 1
    if (!b.expirationdate) return -1
    return new Date(a.expirationdate) - new Date(b.expirationdate)
  })

  const plan = []
  let remaining = totalQtyNeeded

  for (const batch of sorted) {
    if (remaining <= 0) break
    const take = Math.min(batch.quantity, remaining)
    plan.push({
      rawtransactionid: batch.rawtransactionid,
      rawproductid: batch.rawproductid,
      branchid: batch.branchid,
      qtyToDeduct: take,
    })
    remaining -= take
  }

  return plan
}

/**
 * Build the rawproducttransaction INSERT rows needed to record FEFO deductions
 * for an entire order.
 *
 * @param {Array}  cartItems       Cart items: [{ ProductId, qty, size? }]
 * @param {Array}  allRecipes      All recipe rows (with rawproduct.unit joined)
 * @param {Object} inventoryUnitMap { [rawproductid]: inventoryUnit }
 * @param {Function} getBatchesFn  async (rawproductid, branchid) → batch rows
 * @param {number|null} branchId
 *
 * @returns {Array}  Rows ready to INSERT into rawproducttransaction:
 *                   [{ rawproductid, branchid, transactiontype:'out', quantity,
 *                      expirationdate, reason }]
 */
export async function buildFEFODeductionRows(cartItems, allRecipes, inventoryUnitMap, getBatchesFn, branchId) {
  // Aggregate total needed per rawproductid (in inventory units)
  const deductMap = {}

  for (const cartItem of cartItems) {
    const recipes = allRecipes.filter(r => r.finishedproductid === cartItem.ProductId)
    for (const recipe of recipes) {
      const invUnit = inventoryUnitMap[recipe.rawproductid] ?? recipe.unit
      const needed  = normaliseNeeded(recipe.quantityneeded * cartItem.qty, recipe.unit, invUnit)
      deductMap[recipe.rawproductid] = (deductMap[recipe.rawproductid] ?? 0) + needed
    }
  }

  const insertRows = []

  for (const [rawproductidStr, totalNeeded] of Object.entries(deductMap)) {
    const rawproductid = parseInt(rawproductidStr)
    const batches = await getBatchesFn(rawproductid, branchId)
    const plan    = planFEFODeduction(batches, totalNeeded)

    for (const step of plan) {
      insertRows.push({
        rawproductid: step.rawproductid,
        branchid: step.branchid,
        transactiontype: 'out',
        quantity: +step.qtyToDeduct.toFixed(2),
        expirationdate: null, // 'out' rows don't carry expiry
        reason: 'Sale deduction (FEFO)',
        source_batch_id: step.rawtransactionid, // optional traceability
      })
    }
  }

  return insertRows
}

// ─── RECIPE AUTO-UNIT HELPER ──────────────────────────────────────────────────

/**
 * When a user picks a raw product in the recipe editor, auto-fill the unit
 * field with whatever unit that raw product uses in the inventory.
 * Falls back to 'g' if unknown.
 */
export function suggestRecipeUnit(rawproductid, rawProductsArray) {
  const rp = rawProductsArray.find(r => r.rawproductid === rawproductid)
  return rp?.unit ?? 'g'
}

// ─── DISPLAY HELPERS ─────────────────────────────────────────────────────────

/**
 * Format a quantity + unit nicely for display.
 *   formatQty(1500, 'g')  → '1500 g  (1.5 kg)'
 *   formatQty(0.5, 'kg')  → '0.5 kg'
 */
export function formatQtyDisplay(qty, unit) {
  if (!qty && qty !== 0) return '—'
  const u = (unit ?? '').toLowerCase()
  let hint = ''
  if (u === 'g'  && qty >= 1000) hint = ` (${(qty / 1000).toFixed(2)} kg)`
  if (u === 'ml' && qty >= 1000) hint = ` (${(qty / 1000).toFixed(2)} l)`
  if (u === 'kg' && qty < 1)     hint = ` (${(qty * 1000).toFixed(2)} g)`
  if (u === 'l'  && qty < 1)     hint = ` (${(qty * 1000).toFixed(2)} ml)`
  return `${+qty.toFixed(2)} ${unit}${hint}`
}
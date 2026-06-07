import { ref, watch, onMounted } from 'vue'
import { supabase } from '@/supabase.js'

const ALL_TYPES = ['product', 'rawmaterial', 'employee', 'sale']

export function useSearchData(userBranchRef = null, allowedTypes = ALL_TYPES) {
  const allItems = ref([])
  const isLoading = ref(true)
  const error = ref(null)
  const currentBranch = ref(null)

  const fetchAll = async (branchId) => {
    isLoading.value = true
    error.value = null
    currentBranch.value = branchId
    const items = []

    try {
      // Fetch inventory stock for accurate product stock status
      let stockMap = {}
      if (allowedTypes.includes('product')) {
        let inventoryQuery = supabase
          .from('inventory')
          .select('ProductId, Quantity, LowStockThreshold, BranchId')
        if (branchId) inventoryQuery = inventoryQuery.eq('BranchId', branchId)
        const { data: inventoryRows } = await inventoryQuery
        for (const inv of inventoryRows || []) {
          const key = `${inv.ProductId}:${inv.BranchId}`
          stockMap[key] = { qty: inv.Quantity, threshold: inv.LowStockThreshold }
        }

        // Fetch products (shared across branches; stock tracked in inventory)
        const { data: products } = await supabase
          .from('product')
          .select('ProductId, ProductName, Category, Price, CreatedAt')

        if (products) {
          products.forEach(p => {
            const invEntry = Object.entries(stockMap).find(([k]) =>
              k.startsWith(`${p.ProductId}:`)
            )
            const stock = invEntry?.[1]
            const stockBranch = invEntry ? invEntry[0].split(':')[1] : null
            let stockStatus = 'Out of Stock'
            if (stock) {
              if (stock.qty === 0) stockStatus = 'Out of Stock'
              else if (stock.qty <= (stock.threshold || 0)) stockStatus = 'Low Stock'
              else stockStatus = 'In Stock'
            }
            items.push({
              id: `prod-${p.ProductId}`,
              type: 'product',
              title: p.ProductName,
              description: p.Category || 'Menu item',
              details: `₱${(p.Price || 0).toFixed(2)}`,
              status: stockStatus,
              branch: stockBranch || 'all',
              category: p.Category || 'Uncategorized',
              date: p.CreatedAt,
            })
          })
        }
      }

      // Fetch raw materials (global, not branch-specific)
      if (allowedTypes.includes('rawmaterial')) {
        const { data: rawProducts } = await supabase
          .from('rawproduct')
          .select('rawproductid, name, category, unit, stockquantity, reorderlevel, expirationdate')

        if (rawProducts) {
          rawProducts.forEach(r => {
            const qty = r.stockquantity || 0
            const rl = r.reorderlevel || 0
            let status = 'In Stock'
            if (qty === 0) status = 'Out of Stock'
            else if (qty <= rl) status = 'Low Stock'

            items.push({
              id: `raw-${r.rawproductid}`,
              type: 'rawmaterial',
              title: r.name,
              description: r.category || 'Raw material',
              details: `${qty} ${r.unit || ''} in stock`,
              status,
              branch: 'all',
              category: r.category || 'Uncategorized',
              date: null,
            })
          })
        }
      }

      // Fetch employees (exclude archived) — only if allowed by role
      if (allowedTypes.includes('employee')) {
        let employeeQuery = supabase
          .from('employee')
          .select('EmployeeId, FirstName, LastName, Position, Department, BranchAssigned, Status')
          .neq('Status', 'Archived')
        if (branchId) employeeQuery = employeeQuery.eq('BranchAssigned', branchId)
        const { data: employees } = await employeeQuery

        if (employees) {
          employees.forEach(e => {
            items.push({
              id: `emp-${e.EmployeeId}`,
              type: 'employee',
              title: `${e.FirstName} ${e.LastName}`,
              description: e.Position || e.Department || 'Employee',
              details: `${e.Department || ''} Department`,
              status: e.Status || 'Active',
              branch: String(e.BranchAssigned || ''),
              department: e.Department || 'Unassigned',
              date: null,
            })
          })
        }
      }

      // Fetch orders (limit to recent 500 for performance) — only if allowed by role
      if (allowedTypes.includes('sale')) {
        let orderQuery = supabase
          .from('orders')
          .select('OrderId, TotalAmount, FinalAmount, PaymentMethod, Status, CreatedAt, BranchId')
          .order('CreatedAt', { ascending: false })
          .limit(500)
        if (branchId) orderQuery = orderQuery.eq('BranchId', branchId)
        const { data: orders } = await orderQuery

        if (orders) {
          orders.forEach(o => {
            items.push({
              id: `sale-${o.OrderId}`,
              type: 'sale',
              title: `Order #${o.OrderId}`,
              description: `${o.PaymentMethod || 'Unknown'} payment`,
              details: `₱${((o.FinalAmount || o.TotalAmount || 0)).toFixed(2)}`,
              status: o.Status || 'Completed',
              branch: String(o.BranchId || ''),
              date: o.CreatedAt,
            })
          })
        }
      }

      allItems.value = items
    } catch (err) {
      console.error('Search data fetch error:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // If a ref is passed, watch it and refetch when branch changes
  if (userBranchRef && userBranchRef.__v_isRef) {
    watch(userBranchRef, (newVal) => {
      fetchAll(newVal)
    }, { immediate: true })
  } else {
    // Fallback: use plain value or null
    onMounted(() => fetchAll(userBranchRef))
  }

  return { allItems, isLoading, error, refetch: (branchOverride) => fetchAll(branchOverride !== undefined ? branchOverride : currentBranch.value) }
}

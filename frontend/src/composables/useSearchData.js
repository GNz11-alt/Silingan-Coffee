import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase.js'

export function useSearchData() {
  const allItems = ref([])
  const isLoading = ref(true)
  const error = ref(null)

  const fetchAll = async () => {
    isLoading.value = true
    error.value = null
    const items = []

    try {
      // Fetch inventory stock for accurate product stock status
      const { data: inventoryRows } = await supabase
        .from('inventory')
        .select('ProductId, Quantity, LowStockThreshold, BranchId')
      const stockMap = {}
      for (const inv of inventoryRows || []) {
        const key = `${inv.ProductId}:${inv.BranchId}`
        stockMap[key] = { qty: inv.Quantity, threshold: inv.LowStockThreshold }
      }

      // Fetch products
      const { data: products } = await supabase
        .from('product')
        .select('ProductId, ProductName, Category, Price, BranchId, CreatedAt')

      if (products) {
        products.forEach(p => {
          const invKey = `${p.ProductId}:${p.BranchId}`
          const stock = stockMap[invKey]
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
            branch: String(p.BranchId || ''),
            category: p.Category || 'Uncategorized',
            date: p.CreatedAt,
          })
        })
      }

      // Fetch raw materials
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

      // Fetch employees
      const { data: employees } = await supabase
        .from('employee')
        .select('EmployeeId, FirstName, LastName, Position, Department, BranchAssigned, Status')

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

      // Fetch orders (limit to recent 500 for performance)
      const { data: orders } = await supabase
        .from('orders')
        .select('OrderId, TotalAmount, FinalAmount, PaymentMethod, Status, CreatedAt, BranchId')
        .order('CreatedAt', { ascending: false })
        .limit(500)

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

      allItems.value = items
    } catch (err) {
      console.error('Search data fetch error:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  onMounted(fetchAll)

  return { allItems, isLoading, error, refetch: fetchAll }
}

import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import { supabase } from '@/supabase.js'

pdfMake.vfs = pdfFonts

const REFRESHABLE_BUCKET = 'purchase-orders'

function asNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function sanitizeFileName(value) {
  return String(value || 'purchase-order')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-{2,}/g, '-')
}

function groupByCategory(items) {
  return items.reduce((acc, item) => {
    const key = item.category || 'Uncategorized'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}

function buildRows(items) {
  return items.map((item, index) => {
    const quantity = asNumber(item.orderQty)
    const eoq = asNumber(item.eoq)
    const stock = asNumber(item.stockquantity)
    const reorder = asNumber(item.reorderlevel)

    return [
      { text: String(index + 1), alignment: 'center' },
      item.name || 'N/A',
      { text: `SKU-${String(item.rawproductid || '').padStart(4, '0')}`, alignment: 'center' },
      item.unit || 'N/A',
      { text: String(stock), alignment: 'right' },
      { text: String(reorder), alignment: 'right' },
      { text: String(eoq), alignment: 'right' },
      { text: String(quantity), alignment: 'right', bold: true },
      item.supplierNote || '',
    ]
  })
}

function buildDocument(payload) {
  const categorized = groupByCategory(payload.items)
  const categoryNames = Object.keys(categorized).sort((a, b) => a.localeCompare(b))
  const content = [
    { text: 'Purchase Reorder Form', style: 'title' },
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: `Branch: ${payload.branchName || 'All Branches'}`, style: 'meta' },
            { text: `Prepared By: ${payload.preparedBy || 'Staff'}`, style: 'meta' },
            { text: `Supplier: ${payload.supplierName || 'General Supplier'}`, style: 'meta' },
          ],
        },
        {
          width: 'auto',
          stack: [
            { text: `PO #: ${payload.poNumber}`, style: 'meta', alignment: 'right' },
            { text: `Generated: ${formatDate(payload.generatedAt)}`, style: 'meta', alignment: 'right' },
            { text: `Date Needed: ${formatDate(payload.dateNeeded)}`, style: 'meta', alignment: 'right' },
          ],
        },
      ],
      margin: [0, 0, 0, 12],
    },
  ]

  categoryNames.forEach((category, categoryIndex) => {
    const items = categorized[category]
    const tableBody = [
      [
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: 'Item Name', style: 'tableHeader' },
        { text: 'SKU', style: 'tableHeader', alignment: 'center' },
        { text: 'Unit', style: 'tableHeader' },
        { text: 'Current Stock', style: 'tableHeader', alignment: 'right' },
        { text: 'Reorder Point', style: 'tableHeader', alignment: 'right' },
        { text: 'EOQ', style: 'tableHeader', alignment: 'right' },
        { text: 'Order Qty', style: 'tableHeader', alignment: 'right' },
        { text: 'Supplier Notes', style: 'tableHeader' },
      ],
      ...buildRows(items),
    ]

    content.push({
      text: `Category: ${category}`,
      style: 'sectionHeader',
      margin: categoryIndex === 0 ? [0, 6, 0, 6] : [0, 14, 0, 6],
    })

    content.push({
      table: {
        headerRows: 1,
        widths: [20, '*', 58, 45, 58, 58, 38, 48, '*'],
        body: tableBody,
      },
      layout: 'lightHorizontalLines',
    })
  })

  content.push({
    text: `Total items: ${payload.items.length} | Total order quantity: ${payload.totalOrderQty}`,
    style: 'footerMeta',
    margin: [0, 14, 0, 0],
  })

  return {
    pageSize: 'A4',
    pageMargins: [24, 24, 24, 24],
    content,
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
      meta: { fontSize: 9, color: '#444' },
      sectionHeader: { fontSize: 11, bold: true, color: '#31201d' },
      tableHeader: { fontSize: 8.5, bold: true, fillColor: '#f5f0eb' },
      footerMeta: { fontSize: 9, bold: true, color: '#31201d' },
    },
    defaultStyle: {
      fontSize: 8.5,
    },
  }
}

function toBlob(pdfDoc) {
  return new Promise((resolve) => {
    pdfDoc.getBlob((blob) => resolve(blob))
  })
}

async function uploadToStorage(blob, fileName) {
  const path = `reorders/${new Date().toISOString().slice(0, 10)}/${fileName}`
  const { error } = await supabase
    .storage
    .from(REFRESHABLE_BUCKET)
    .upload(path, blob, { contentType: 'application/pdf', upsert: true })

  if (error) {
    console.warn('[PurchaseOrderPDF] Supabase upload failed:', error.message)
    return null
  }

  const { data } = supabase.storage.from(REFRESHABLE_BUCKET).getPublicUrl(path)
  return { path, publicUrl: data?.publicUrl || null }
}

export async function exportPurchaseOrderPdf({
  branchName,
  preparedBy,
  poNumber,
  dateNeeded,
  supplierName,
  items = [],
  download = true,
  saveToSupabase = false,
}) {
  const normalizedItems = items
    .map((item) => ({
      ...item,
      orderQty: asNumber(item.orderQty),
      eoq: asNumber(item.eoq),
    }))
    .filter((item) => item.orderQty > 0)

  const totalOrderQty = normalizedItems.reduce((sum, item) => sum + item.orderQty, 0)
  const generatedAt = new Date().toISOString()
  const safePo = sanitizeFileName(poNumber || 'po')
  const safeBranch = sanitizeFileName(branchName || 'branch')
  const fileName = `${safePo}-${safeBranch}.pdf`

  const docDefinition = buildDocument({
    branchName,
    preparedBy,
    poNumber,
    dateNeeded,
    supplierName,
    generatedAt,
    items: normalizedItems,
    totalOrderQty,
  })

  const pdfDoc = pdfMake.createPdf(docDefinition)
  if (download) {
    pdfDoc.download(fileName)
  }

  const blob = await toBlob(pdfDoc)
  const upload = saveToSupabase ? await uploadToStorage(blob, fileName) : null

  return {
    fileName,
    totalOrderQty,
    itemCount: normalizedItems.length,
    upload,
  }
}

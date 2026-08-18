export interface LedgerEntry {
  id: string
  sNo: number
  date: string
  shipperDescription: string
  invoiceNo: string
  dateOfShip: string
  billOfLanding: string
  surrenderedBL: boolean
  containerNo: string
  consignee: string
  quantity: string
  debit: number
  credit: number
  balance: number
  pdfPathname?: string
}

export interface LedgerSettings {
  companyLogo: string
  backgroundImage: string
}

export interface Company {
  id: string
  name: string
  ledgerEntries: LedgerEntry[]
  ledgerSettings?: LedgerSettings
}

export interface Account {
  id: string
  name: string
  companies: Company[]
}

export interface InvoiceItem {
  id: string
  sNo: number
  description: string
  containerSize: string
  quantity: string
  unit: string
  grossWeight: string
  price: number
  detentionDetails?: string
}

export interface Invoice {
  id: string
  invoiceNo: string
  date: string
  companyId: string
  companyName: string
  shipper: string
  consignee: string
  origin: string
  destination: string
  blNo: string
  containers: string
  items: InvoiceItem[]
  exchangeRate: number
  preparedBy: string
  grandTotal: number
}

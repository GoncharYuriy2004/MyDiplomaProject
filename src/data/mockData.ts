export type User = {
    _id: string;
    username: string;
    password_hash: string;
    role: "manager" | "worker";
    full_name: string;
};

export type Supplier = {
    _id: string;
    name: string;
    edrpou: string;
    contact_info?: string;
    bank_details?: string;
    address?: string;
    contact_person?: string;
    email?: string;
    telegram?: string;
    phone?: string;
    iban?: string;
};

export type Product = {
    _id: string;
    name: string;
    sku: string;
    category: string;
    current_stock: number;
    min_stock: number;
    unit: string;
    unit_price: number;
    tax_rate: number;
    supplier_id?: string;
    status: 'available' | 'issued' | 'written_off' | 'damaged';
    received_date?: string;
    expiry_date?: string | null;
    delivery_date?: string;
    issued_date?: string | null;
    writeoff_date?: string;
    issued_by?: string | null;
    issued_to?: string | null;
    received_by?: string;
    written_off_by?: string;
    writeoff_reason?: string;
};

export type Transaction = {
    _id: string;
    type: "in" | "out" | "write_off";
    product_id: string;
    quantity: number;
    date: string;
    user_id: string;
    ref_document_id: string;
};

export type Document = {
    _id: string;
    type: "invoice" | "act_writeoff" | "discrepancy_act" | "issuing";
    status: "pending" | "approved" | "rejected";
    created_at: string;
    pdf_link?: string;
    total_sum?: number;
    total_vat?: number;
};

export const MOCK_USERS: User[] = [
    {
        _id: "u1",
        username: "manager",
        password_hash: "1234",
        role: "manager",
        full_name: "John Manager"
    },
    {
        _id: "u2",
        username: "worker",
        password_hash: "1234",
        role: "worker",
        full_name: "Alice Worker"
    }
];

export const MOCK_SUPPLIERS: Supplier[] = [
    { _id: "s1", name: "TechParts LLC", edrpou: "12345678", contact_info: "contact@techparts.com", bank_details: "IBAN UA12345678" }
];

export const MOCK_PRODUCTS: Product[] = [
    { 
        _id: "p1", 
        name: "Processor Intel i7", 
        sku: "CPU-I7", 
        category: "cpu", 
        current_stock: 12, 
        min_stock: 5,
        unit: "шт",
        unit_price: 300, 
        tax_rate: 0.2,
        status: 'available',
        received_date: "2026-02-10T10:00:00Z"
    },
    { 
        _id: "p2", 
        name: "RAM 16GB DDR4", 
        sku: "RAM-16G", 
        category: "ram", 
        current_stock: 45, 
        min_stock: 20,
        unit: "шт",
        unit_price: 80, 
        tax_rate: 0.2,
        status: 'available',
        received_date: "2026-02-12T14:00:00Z"
    },
    { 
        _id: "p3", 
        name: "SSD 1TB", 
        sku: "SSD-1T", 
        category: "storage", 
        current_stock: 30, 
        min_stock: 15,
        unit: "шт",
        unit_price: 120, 
        tax_rate: 0.2,
        status: 'available',
        received_date: "2026-02-15T09:00:00Z"
    },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
    { _id: "t1", type: "in", product_id: "p1", quantity: 5, date: "2026-02-15T10:00:00Z", user_id: "u2", ref_document_id: "d1" },
    { _id: "t2", type: "out", product_id: "p2", quantity: 2, date: "2026-02-18T14:30:00Z", user_id: "u2", ref_document_id: "" }
];

export const MOCK_DOCUMENTS: Document[] = [
    { _id: "d1", type: "invoice", status: "approved", created_at: "2026-02-15T09:00:00Z", total_sum: 1500, total_vat: 300 },
    { _id: "d2", type: "act_writeoff", status: "pending", created_at: "2026-02-19T11:00:00Z" }
];

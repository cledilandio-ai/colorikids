import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALLOWED_PAYMENT_METHODS = ["PIX", "CASH", "CREDIT", "DEBIT", "DINHEIRO", "CARTAO", "CREDIARIO"] as const;
const ALLOWED_ORDER_STATUS = ["PENDING", "COMPLETED", "CANCELLED"] as const;
const ALLOWED_ORDER_TYPES = ["WEB", "POS"] as const;
const ALLOWED_TREASURY_TYPES = ["IN", "OUT"] as const;

// ─── Variant Schema (reused in product create/update) ───────────────────────

const variantSchema = z.object({
    id: z.string().optional(),
    size: z.string().min(1, "Tamanho é obrigatório"),
    color: z.string().optional().default(""),
    stockQuantity: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().int().min(0)),
    minStock: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().int().min(0)).optional().default(1),
    imageUrl: z.string().url().nullable().optional(),
    sku: z.string().optional(),
});

// ─── Payment Schema (reused in orders) ──────────────────────────────────────

const paymentSchema = z.object({
    amount: z.number().positive("Valor do pagamento deve ser positivo"),
    method: z.enum(ALLOWED_PAYMENT_METHODS),
    dueDate: z.string().optional(), // ISO date string for CREDIARIO
});

// ─── 1. Treasury Transaction ────────────────────────────────────────────────

export const treasurySchema = z.object({
    description: z.string().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa"),
    amount: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().positive("Valor deve ser positivo")),
    type: z.enum(ALLOWED_TREASURY_TYPES),
    category: z.string().min(1, "Categoria é obrigatória").max(100, "Categoria muito longa"),
});

// ─── 2. Create Order ────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
    customerName: z.string().min(1, "Nome do cliente é obrigatório").max(200),
    customerPhone: z.string().optional(),
    total: z.number().positive("Total do pedido deve ser positivo"),
    status: z.enum(ALLOWED_ORDER_STATUS).optional().default("PENDING"),
    type: z.enum(ALLOWED_ORDER_TYPES).optional().default("WEB"),
    items: z.string().min(1, "Items são obrigatórios"),
    paymentMethod: z.string().optional(),
    cashRegisterId: z.string().optional(),
    customerId: z.string().optional(),
    payments: z.array(paymentSchema).optional(),
});

// ─── 3. Update Order ────────────────────────────────────────────────────────

export const updateOrderSchema = z.object({
    status: z.enum(ALLOWED_ORDER_STATUS).optional(),
    total: z.number().positive("Total do pedido deve ser positivo").optional(),
    items: z.string().optional(),
    payments: z.array(paymentSchema).optional(),
    cashRegisterId: z.string().optional(),
    customerId: z.string().optional(),
    type: z.enum(ALLOWED_ORDER_TYPES).optional(),
    customerName: z.string().min(1).max(200).optional(),
});

// ─── 4. Create Product ──────────────────────────────────────────────────────

export const createProductSchema = z.object({
    name: z.string().min(1, "Nome do produto é obrigatório").max(300),
    description: z.string().max(2000).optional(),
    basePrice: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().positive("Preço deve ser positivo")),
    costPrice: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(0)).optional().default(0),
    imageUrl: z.string().url().nullable().optional(),
    category: z.string().max(100).optional(),
    gender: z.string().max(50).optional(),
    supplier: z.string().max(200).optional(),
    variants: z.array(variantSchema).min(1, "Pelo menos uma variante é obrigatória"),
});

// ─── 5. Update Product ──────────────────────────────────────────────────────

export const updateProductSchema = z.object({
    name: z.string().min(1).max(300).optional(),
    description: z.string().max(2000).optional(),
    basePrice: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().positive()).optional(),
    costPrice: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(0)).optional(),
    imageUrl: z.string().url().nullable().optional(),
    category: z.string().max(100).optional(),
    gender: z.string().max(50).optional(),
    supplier: z.string().max(200).optional(),
    variants: z.array(variantSchema).optional(),
});

// ─── 6. Restock ─────────────────────────────────────────────────────────────

export const restockSchema = z.object({
    variantId: z.string().min(1, "ID da variante é obrigatório"),
    quantity: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().int().positive("Quantidade deve ser positiva")),
    unitCost: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(0, "Custo unitário não pode ser negativo")),
    productId: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    imageUrl: z.string().url().nullable().optional(),
    minStock: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().int().min(0)).optional().default(1),
});

// ─── 7. Customer ────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório").max(200),
    phone: z.string().max(30).optional(),
    cpf: z.string().max(14).optional(),
    email: z.string().email("Email inválido").max(200).optional().or(z.literal("")),
    address: z.string().max(500).optional(),
});

export const updateCustomerSchema = z.object({
    id: z.string().min(1, "ID é obrigatório"),
    name: z.string().min(1, "Nome é obrigatório").max(200),
    phone: z.string().max(30).optional(),
    cpf: z.string().max(14).optional(),
    email: z.string().email("Email inválido").max(200).optional().or(z.literal("")),
    address: z.string().max(500).optional(),
});

// ─── 8. Cash Register ───────────────────────────────────────────────────────

const openRegisterSchema = z.object({
    action: z.literal("OPEN"),
    initialAmount: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(0, "Valor inicial não pode ser negativo")),
    withdrawFromTreasury: z.boolean().optional().default(false),
});

const closeRegisterSchema = z.object({
    action: z.literal("CLOSE"),
    finalAmount: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(0, "Valor final não pode ser negativo")),
    transferredAmount: z.union([z.string(), z.number()]).transform(v => Number(v)).pipe(z.number().min(0)).optional().default(0),
});

export const cashRegisterSchema = z.discriminatedUnion("action", [openRegisterSchema, closeRegisterSchema]);

// ─── 9. Store Settings ───────────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
    whatsapp: z.string().max(20).optional(),
    whatsappMessage: z.string().max(500).optional(),
    companyName: z.string().min(1).max(200).optional(),
    cnpj: z.string().max(18).optional(),
    instagram: z.string().max(200).optional(),
    featuredImageUrls: z.array(z.string()).optional(),
    pixKey: z.string().max(100).optional(),
    pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"]).optional(),
});

// ─── 10. Change Password ─────────────────────────────────────────────────────

export const changePasswordSchema = z.object({
    userId: z.string().min(1, "ID do usuário é obrigatório"),
    newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128),
});

// ─── 12. NF-e Import Confirm ─────────────────────────────────────────────────

const nfeImportItemSchema = z.object({
    nfeItemNumber: z.number().int().positive(),
    nfeCode: z.string().optional().default(""),
    description: z.string().optional().default(""),
    unit: z.string().optional().default("UN"),
    quantity: z.number().positive(),
    unitValue: z.number().min(0),
    totalValue: z.number().min(0),
    matched: z.boolean(),
    matchedBy: z.enum(["SKU", "NAME", "MANUAL"]).nullable().optional(),
    variantId: z.string().nullable().optional(),
    productId: z.string().nullable().optional(),
    ignore: z.boolean().optional().default(false),
    isNewProduct: z.boolean().optional().default(false),
});

export const nfeImportConfirmSchema = z.object({
    accessKey: z.string().length(44, "Chave de acesso deve ter 44 dígitos"),
    nfeNumber: z.string().optional(),
    serie: z.string().optional(),
    supplierName: z.string().optional(),
    supplierCnpj: z.string().optional(),
    totalValue: z.number().min(0).optional(),
    xmlRaw: z.string().optional(),
    items: z.array(nfeImportItemSchema).min(1, "Pelo menos um item é obrigatório"),
});

// ─── 11. Verify Owner Password ───────────────────────────────────────────────

export const verifyOwnerSchema = z.object({
    password: z.string().min(1, "Senha é obrigatória"),
});

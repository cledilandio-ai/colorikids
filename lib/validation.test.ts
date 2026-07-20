import { describe, it, expect } from "vitest";
import {
    treasurySchema,
    createOrderSchema,
    updateOrderSchema,
    createProductSchema,
    updateProductSchema,
    restockSchema,
    createCustomerSchema,
    updateCustomerSchema,
    cashRegisterSchema,
    updateSettingsSchema,
    changePasswordSchema,
    verifyOwnerSchema,
} from "./validation";

// =============================================================================
// 1. Treasury
// =============================================================================
describe("treasurySchema", () => {
    it("should accept valid treasury transaction", () => {
        const result = treasurySchema.safeParse({
            description: "Venda do dia",
            amount: 150.50,
            type: "IN",
            category: "VENDA",
        });
        expect(result.success).toBe(true);
    });

    it("should accept string amount (transform)", () => {
        const result = treasurySchema.safeParse({
            description: "Venda",
            amount: "99.90",
            type: "OUT",
            category: "DESPESA",
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.amount).toBe(99.90);
    });

    it("should reject empty description", () => {
        const result = treasurySchema.safeParse({
            description: "",
            amount: 100,
            type: "IN",
            category: "VENDA",
        });
        expect(result.success).toBe(false);
    });

    it("should reject negative amount", () => {
        const result = treasurySchema.safeParse({
            description: "Teste",
            amount: -10,
            type: "IN",
            category: "VENDA",
        });
        expect(result.success).toBe(false);
    });

    it("should reject invalid type", () => {
        const result = treasurySchema.safeParse({
            description: "Teste",
            amount: 100,
            type: "TRANSFER",
            category: "VENDA",
        });
        expect(result.success).toBe(false);
    });

    it("should reject missing category", () => {
        const result = treasurySchema.safeParse({
            description: "Teste",
            amount: 100,
            type: "IN",
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 2. Create Order
// =============================================================================
describe("createOrderSchema", () => {
    it("should accept valid order", () => {
        const result = createOrderSchema.safeParse({
            customerName: "João Silva",
            total: 199.90,
            items: JSON.stringify([{ productId: "1", qty: 2 }]),
        });
        expect(result.success).toBe(true);
    });

    it("should apply defaults for status and type", () => {
        const result = createOrderSchema.safeParse({
            customerName: "Maria",
            total: 50,
            items: "[]",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.status).toBe("PENDING");
            expect(result.data.type).toBe("WEB");
        }
    });

    it("should accept payments array", () => {
        const result = createOrderSchema.safeParse({
            customerName: "Carlos",
            total: 300,
            items: "[]",
            payments: [
                { amount: 150, method: "PIX" },
                { amount: 150, method: "CASH" },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("should reject empty customer name", () => {
        const result = createOrderSchema.safeParse({
            customerName: "",
            total: 100,
            items: "[]",
        });
        expect(result.success).toBe(false);
    });

    it("should reject negative total", () => {
        const result = createOrderSchema.safeParse({
            customerName: "Teste",
            total: -50,
            items: "[]",
        });
        expect(result.success).toBe(false);
    });

    it("should reject invalid payment method", () => {
        const result = createOrderSchema.safeParse({
            customerName: "Teste",
            total: 100,
            items: "[]",
            payments: [{ amount: 100, method: "BITCOIN" }],
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 3. Update Order
// =============================================================================
describe("updateOrderSchema", () => {
    it("should accept partial update", () => {
        const result = updateOrderSchema.safeParse({
            status: "COMPLETED",
        });
        expect(result.success).toBe(true);
    });

    it("should accept empty object (no fields to update)", () => {
        const result = updateOrderSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
        const result = updateOrderSchema.safeParse({
            status: "INVALID",
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 4. Create Product
// =============================================================================
describe("createProductSchema", () => {
    it("should accept valid product with variants", () => {
        const result = createProductSchema.safeParse({
            name: "Camiseta",
            basePrice: 59.90,
            variants: [
                { size: "P", stockQuantity: 10 },
                { size: "M", stockQuantity: 5, color: "Azul" },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("should accept string basePrice (transform)", () => {
        const result = createProductSchema.safeParse({
            name: "Calça",
            basePrice: "89.90",
            variants: [{ size: "G", stockQuantity: 3 }],
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.basePrice).toBe(89.90);
    });

    it("should reject empty name", () => {
        const result = createProductSchema.safeParse({
            name: "",
            basePrice: 10,
            variants: [{ size: "U", stockQuantity: 1 }],
        });
        expect(result.success).toBe(false);
    });

    it("should reject without variants", () => {
        const result = createProductSchema.safeParse({
            name: "Teste",
            basePrice: 10,
            variants: [],
        });
        expect(result.success).toBe(false);
    });

    it("should reject negative basePrice", () => {
        const result = createProductSchema.safeParse({
            name: "Teste",
            basePrice: -10,
            variants: [{ size: "U", stockQuantity: 1 }],
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 5. Update Product
// =============================================================================
describe("updateProductSchema", () => {
    it("should accept partial product update", () => {
        const result = updateProductSchema.safeParse({
            name: "Novo Nome",
            basePrice: 79.90,
        });
        expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
        const result = updateProductSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it("should reject negative basePrice", () => {
        const result = updateProductSchema.safeParse({
            basePrice: -5,
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 6. Restock
// =============================================================================
describe("restockSchema", () => {
    it("should accept valid restock", () => {
        const result = restockSchema.safeParse({
            variantId: "abc-123",
            quantity: 10,
            unitCost: 25.50,
        });
        expect(result.success).toBe(true);
    });

    it("should accept string quantity (transform)", () => {
        const result = restockSchema.safeParse({
            variantId: "abc",
            quantity: "5",
            unitCost: "12.00",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.quantity).toBe(5);
            expect(result.data.unitCost).toBe(12.00);
        }
    });

    it("should reject zero quantity", () => {
        const result = restockSchema.safeParse({
            variantId: "abc",
            quantity: 0,
            unitCost: 10,
        });
        expect(result.success).toBe(false);
    });

    it("should reject negative unitCost", () => {
        const result = restockSchema.safeParse({
            variantId: "abc",
            quantity: 5,
            unitCost: -1,
        });
        expect(result.success).toBe(false);
    });

    it("should default minStock to 1", () => {
        const result = restockSchema.safeParse({
            variantId: "abc",
            quantity: 5,
            unitCost: 10,
        });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.minStock).toBe(1);
    });
});

// =============================================================================
// 7. Customer
// =============================================================================
describe("createCustomerSchema", () => {
    it("should accept valid customer", () => {
        const result = createCustomerSchema.safeParse({
            name: "João Silva",
            phone: "11999999999",
            cpf: "123.456.789-00",
        });
        expect(result.success).toBe(true);
    });

    it("should accept empty email (valid literal)", () => {
        const result = createCustomerSchema.safeParse({
            name: "Maria",
            email: "",
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
        const result = createCustomerSchema.safeParse({
            name: "Teste",
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
        const result = createCustomerSchema.safeParse({
            name: "",
        });
        expect(result.success).toBe(false);
    });
});

describe("updateCustomerSchema", () => {
    it("should require id and name", () => {
        const result = updateCustomerSchema.safeParse({
            id: "abc-123",
            name: "João Atualizado",
        });
        expect(result.success).toBe(true);
    });

    it("should reject missing id", () => {
        const result = updateCustomerSchema.safeParse({
            name: "Teste",
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 8. Cash Register (Discriminated Union)
// =============================================================================
describe("cashRegisterSchema", () => {
    describe("OPEN action", () => {
        it("should accept valid open", () => {
            const result = cashRegisterSchema.safeParse({
                action: "OPEN",
                initialAmount: 200,
            });
            expect(result.success).toBe(true);
        });

        it("should accept withdrawFromTreasury flag", () => {
            const result = cashRegisterSchema.safeParse({
                action: "OPEN",
                initialAmount: 200,
                withdrawFromTreasury: true,
            });
            expect(result.success).toBe(true);
            if (result.success) expect((result.data as any).withdrawFromTreasury).toBe(true);
        });

        it("should reject negative initialAmount", () => {
            const result = cashRegisterSchema.safeParse({
                action: "OPEN",
                initialAmount: -50,
            });
            expect(result.success).toBe(false);
        });
    });

    describe("CLOSE action", () => {
        it("should accept valid close", () => {
            const result = cashRegisterSchema.safeParse({
                action: "CLOSE",
                finalAmount: 500,
            });
            expect(result.success).toBe(true);
        });

        it("should default transferredAmount to 0", () => {
            const result = cashRegisterSchema.safeParse({
                action: "CLOSE",
                finalAmount: 500,
            });
            expect(result.success).toBe(true);
            if (result.success) expect((result.data as any).transferredAmount).toBe(0);
        });
    });

    it("should reject unknown action", () => {
        const result = cashRegisterSchema.safeParse({
            action: "INVALID",
            initialAmount: 100,
        });
        expect(result.success).toBe(false);
    });

    it("should reject OPEN with CLOSE fields", () => {
        const result = cashRegisterSchema.safeParse({
            action: "OPEN",
            finalAmount: 500, // should be initialAmount
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 9. Settings
// =============================================================================
describe("updateSettingsSchema", () => {
    it("should accept valid settings", () => {
        const result = updateSettingsSchema.safeParse({
            companyName: "Minha Loja",
            whatsapp: "5511999999999",
            instagram: "@minhaloja",
            pixKeyType: "CPF",
        });
        expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
        const result = updateSettingsSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it("should reject invalid pixKeyType", () => {
        const result = updateSettingsSchema.safeParse({
            pixKeyType: "INVALID",
        });
        expect(result.success).toBe(false);
    });

    it("should accept featuredImageUrls array", () => {
        const result = updateSettingsSchema.safeParse({
            featuredImageUrls: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
        });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// 10. Change Password
// =============================================================================
describe("changePasswordSchema", () => {
    it("should accept valid password change", () => {
        const result = changePasswordSchema.safeParse({
            userId: "abc-123",
            newPassword: "minhaSenhaSegura123",
        });
        expect(result.success).toBe(true);
    });

    it("should reject short password", () => {
        const result = changePasswordSchema.safeParse({
            userId: "abc",
            newPassword: "123",
        });
        expect(result.success).toBe(false);
    });

    it("should reject empty userId", () => {
        const result = changePasswordSchema.safeParse({
            userId: "",
            newPassword: "minhaSenhaSegura",
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 11. Verify Owner Password
// =============================================================================
describe("verifyOwnerSchema", () => {
    it("should accept valid password", () => {
        const result = verifyOwnerSchema.safeParse({
            password: "minhaSenha",
        });
        expect(result.success).toBe(true);
    });

    it("should reject empty password", () => {
        const result = verifyOwnerSchema.safeParse({
            password: "",
        });
        expect(result.success).toBe(false);
    });
});

export interface VariantInput {
    size: string;
    color: string;
    quantity: number;
}

export interface NfeItemPreview {
    nfeItemNumber: number;
    nfeCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
    matched: boolean;
    matchedBy: "SKU" | "NAME" | "MANUAL" | null;
    productId: string | null;
    variantId: string | null;
    productName: string | null;
    variantLabel: string | null;
    confidence: number;
    ignore?: boolean;
    /** Item foi criado como novo produto dentro do fluxo NF-e (stock já alocado) */
    isNewProduct?: boolean;
}

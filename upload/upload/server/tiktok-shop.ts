/**
 * TikTok Shop - Vente de produits
 * 
 * Gère :
 * - Création et gestion de produits
 * - Panier et commandes
 * - Paiements et livraison
 * - Commissions du créateur
 * - Historique des ventes
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Interface pour un produit
 */
export interface ShopProduct {
  id: string;
  creatorId: number;
  name: string;
  description: string;
  price: number; // en cents
  currency: string;
  imageUrl?: string;
  category: string;
  stock: number;
  creatorCommission: number; // pourcentage (0-100)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour une commande
 */
export interface ShopOrder {
  id: string;
  buyerId: number;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number; // en cents
  currency: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
  paymentMethod?: 'stripe' | 'mtn' | 'orange' | 'wave' | 'airtel';
}

/**
 * Interface pour une vente (pour les créateurs)
 */
export interface CreatorSale {
  id: string;
  creatorId: number;
  orderId: string;
  productId: string;
  quantity: number;
  saleAmount: number; // montant total en cents
  creatorEarnings: number; // commission du créateur en cents
  platformFee: number; // commission de la plateforme en cents
  status: 'pending' | 'completed' | 'refunded';
  createdAt: Date;
}

/**
 * Classe pour gérer le TikTok Shop
 */
export class TikTokShopManager {
  private products: Map<string, ShopProduct> = new Map();
  private orders: Map<string, ShopOrder> = new Map();
  private sales: Map<string, CreatorSale> = new Map();
  private creatorProducts: Map<number, string[]> = new Map(); // creatorId -> productIds
  private creatorSales: Map<number, string[]> = new Map(); // creatorId -> saleIds

  /**
   * Créer un produit
   */
  createProduct(
    creatorId: number,
    name: string,
    description: string,
    price: number,
    category: string,
    stock: number,
    creatorCommission: number = 70,
    currency: string = 'USD',
    imageUrl?: string
  ): ShopProduct {
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const product: ShopProduct = {
      id: productId,
      creatorId,
      name,
      description,
      price,
      currency,
      imageUrl,
      category,
      stock,
      creatorCommission,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(productId, product);

    // Ajouter à la liste des produits du créateur
    if (!this.creatorProducts.has(creatorId)) {
      this.creatorProducts.set(creatorId, []);
    }
    this.creatorProducts.get(creatorId)!.push(productId);

    logger.info('Shop product created', {
      productId,
      creatorId,
      name,
      price,
    });

    return product;
  }

  /**
   * Obtenir un produit
   */
  getProduct(productId: string): ShopProduct | undefined {
    return this.products.get(productId);
  }

  /**
   * Obtenir les produits d'un créateur
   */
  getCreatorProducts(creatorId: number): ShopProduct[] {
    const productIds = this.creatorProducts.get(creatorId) || [];
    return productIds
      .map((id) => this.products.get(id))
      .filter((p) => p !== undefined) as ShopProduct[];
  }

  /**
   * Mettre à jour un produit
   */
  updateProduct(productId: string, updates: Partial<ShopProduct>): boolean {
    const product = this.products.get(productId);
    if (!product) {
      logger.warn('Product not found', { productId });
      return false;
    }

    Object.assign(product, updates, { updatedAt: new Date() });

    logger.info('Shop product updated', {
      productId,
      updates: Object.keys(updates),
    });

    return true;
  }

  /**
   * Créer une commande
   */
  createOrder(
    buyerId: number,
    items: { productId: string; quantity: number }[],
    currency: string = 'USD'
  ): ShopOrder | null {
    let totalAmount = 0;
    const orderItems: ShopOrder['items'] = [];

    // Valider et calculer le total
    for (const item of items) {
      const product = this.products.get(item.productId);
      if (!product) {
        logger.warn('Product not found in order', { productId: item.productId });
        return null;
      }

      if (product.stock < item.quantity) {
        logger.warn('Insufficient stock', { productId: item.productId, requested: item.quantity, available: product.stock });
        return null;
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const order: ShopOrder = {
      id: orderId,
      buyerId,
      items: orderItems,
      totalAmount,
      currency,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(orderId, order);

    // Réduire le stock
    for (const item of items) {
      const product = this.products.get(item.productId)!;
      product.stock -= item.quantity;
    }

    logger.info('Shop order created', {
      orderId,
      buyerId,
      itemCount: items.length,
      totalAmount,
    });

    return order;
  }

  /**
   * Obtenir une commande
   */
  getOrder(orderId: string): ShopOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Mettre à jour le statut d'une commande
   */
  updateOrderStatus(orderId: string, status: ShopOrder['status']): boolean {
    const order = this.orders.get(orderId);
    if (!order) {
      logger.warn('Order not found', { orderId });
      return false;
    }

    order.status = status;
    order.updatedAt = new Date();

    // Créer les ventes pour les créateurs
    if (status === 'delivered') {
      this.createSalesFromOrder(orderId);
    }

    logger.info('Order status updated', { orderId, status });

    return true;
  }

  /**
   * Créer les ventes pour les créateurs à partir d'une commande
   */
  private createSalesFromOrder(orderId: string): void {
    const order = this.orders.get(orderId);
    if (!order) return;

    for (const item of order.items) {
      const product = this.products.get(item.productId);
      if (!product) continue;

      const saleAmount = item.price * item.quantity;
      const creatorEarnings = Math.floor((saleAmount * product.creatorCommission) / 100);
      const platformFee = saleAmount - creatorEarnings;

      const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const sale: CreatorSale = {
        id: saleId,
        creatorId: product.creatorId,
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        saleAmount,
        creatorEarnings,
        platformFee,
        status: 'completed',
        createdAt: new Date(),
      };

      this.sales.set(saleId, sale);

      // Ajouter à la liste des ventes du créateur
      if (!this.creatorSales.has(product.creatorId)) {
        this.creatorSales.set(product.creatorId, []);
      }
      this.creatorSales.get(product.creatorId)!.push(saleId);

      logger.info('Creator sale created', {
        saleId,
        creatorId: product.creatorId,
        earnings: creatorEarnings,
      });
    }
  }

  /**
   * Obtenir les ventes d'un créateur
   */
  getCreatorSales(creatorId: number): CreatorSale[] {
    const saleIds = this.creatorSales.get(creatorId) || [];
    return saleIds
      .map((id) => this.sales.get(id))
      .filter((s) => s !== undefined) as CreatorSale[];
  }

  /**
   * Obtenir les revenus totaux d'un créateur
   */
  getCreatorShopEarnings(creatorId: number): number {
    const sales = this.getCreatorSales(creatorId);
    return sales.reduce((sum, sale) => sum + sale.creatorEarnings, 0);
  }

  /**
   * Obtenir les statistiques du shop
   */
  getShopStats(): {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCreatorEarnings: number;
  } {
    let totalRevenue = 0;
    let totalCreatorEarnings = 0;

    this.sales.forEach((sale) => {
      if (sale.status === 'completed') {
        totalRevenue += sale.saleAmount;
        totalCreatorEarnings += sale.creatorEarnings;
      }
    });

    return {
      totalProducts: this.products.size,
      totalOrders: this.orders.size,
      totalRevenue,
      totalCreatorEarnings,
    };
  }

  /**
   * Obtenir les produits populaires
   */
  getPopularProducts(limit: number = 10): ShopProduct[] {
    const productSales = new Map<string, number>();

    this.sales.forEach((sale) => {
      const count = productSales.get(sale.productId) || 0;
      productSales.set(sale.productId, count + sale.quantity);
    });

    return Array.from(this.products.values())
      .sort((a, b) => (productSales.get(b.id) || 0) - (productSales.get(a.id) || 0))
      .slice(0, limit);
  }
}

// Singleton instance
let shopManager: TikTokShopManager | null = null;

export function getTikTokShopManager(): TikTokShopManager {
  if (!shopManager) {
    shopManager = new TikTokShopManager();
  }
  return shopManager;
}

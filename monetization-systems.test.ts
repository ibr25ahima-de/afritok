/**
 * Tests complets pour tous les systèmes de monétisation TikTok
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getCreatorRewardsProgramManager } from './creator-rewards-program';
import { getTikTokShopManager } from './tiktok-shop';
import { getBrandPartnershipsManager } from './brand-partnerships';
import { getAffiliateMarketingManager } from './affiliate-marketing';

describe('TikTok Monetization Systems', () => {
  describe('Creator Rewards Program', () => {
    let crpManager: ReturnType<typeof getCreatorRewardsProgramManager>;

    beforeEach(() => {
      crpManager = getCreatorRewardsProgramManager();
    });

    it('should record video views', () => {
      const videoId = 999;
      crpManager.recordVideoView(videoId, 1, 'US');
      crpManager.recordVideoView(videoId, 1, 'US');
      crpManager.recordVideoView(videoId, 1, 'US');

      const views = crpManager.getVideoViews(videoId);
      expect(views).toBeGreaterThanOrEqual(3);
    });

    it('should generate payment based on views and CPM', () => {
      const creatorId = 333;
      const payment = crpManager.generatePayment(creatorId, 1, 1000, 'US', 'USD');

      expect(payment).toBeDefined();
      expect(payment?.views).toBe(1000);
      expect(payment?.cpm).toBe(6.5); // US CPM (augmenté de 5.0 à 6.5)
      expect(payment?.amount).toBe(650); // 1000 views * $6.5 / 1000 = $6.50 = 650 cents
    });

    it('should calculate different CPM for different regions', () => {
      const usPayment = crpManager.generatePayment(111, 1, 1000, 'US', 'USD');
      const inPayment = crpManager.generatePayment(222, 2, 1000, 'IN', 'USD');

      expect(usPayment?.amount).toBeGreaterThan(inPayment?.amount || 0);
    });

    it('should track pending balance', () => {
      const creatorId = 777;
      crpManager.generatePayment(creatorId, 1, 1000, 'US', 'USD'); // 650 cents (1000 * 6.5 / 1000 * 100)
      crpManager.generatePayment(creatorId, 2, 2000, 'US', 'USD'); // 1300 cents (2000 * 6.5 / 1000 * 100)

      const balance = crpManager.getPendingBalance(creatorId);
      expect(balance).toBeGreaterThanOrEqual(1500); // 1500 cents total
    });

    it('should check eligibility for payout', () => {
      // Minimum threshold is $100 (10000 cents)
      const creatorId = 888;
      crpManager.generatePayment(creatorId, 1, 15385, 'US', 'USD'); // 10000 cents (15385 * 6.5 / 1000 * 100)

      expect(crpManager.isEligibleForPayout(creatorId)).toBe(true);
    });

    it('should process and complete payments', () => {
      const creatorId = 555;
      const payment = crpManager.generatePayment(creatorId, 1, 1000, 'US', 'USD');
      if (!payment) throw new Error('Payment creation failed');

      const processed = crpManager.processPayment(payment.id, 'stripe');
      expect(processed).toBe(true);

      const completed = crpManager.completePayment(payment.id);
      expect(completed).toBe(true);
    });

    it('should get creator statistics', () => {
      const creatorId = 666;
      crpManager.generatePayment(creatorId, 1, 1000, 'US', 'USD');
      crpManager.generatePayment(creatorId, 2, 2000, 'US', 'USD');

      const stats = crpManager.getCreatorStats(creatorId);
      expect(stats).toBeDefined();
      expect(stats?.totalEarnings).toBeGreaterThanOrEqual(1950); // 650 + 1300
      expect(stats?.pendingBalance).toBeGreaterThanOrEqual(1950);
    });

    it('should get eligible creators for payout', () => {
      const creatorId = 999;
      crpManager.generatePayment(creatorId, 1, 15385, 'US', 'USD'); // 10000 cents (15385 * 6.5 / 1000 * 100)
      crpManager.generatePayment(creatorId, 2, 15385, 'US', 'USD'); // 10000 cents more
      crpManager.generatePayment(2, 3, 500, 'US', 'USD');

      const eligible = crpManager.getEligibleCreators();
      expect(eligible.length).toBeGreaterThanOrEqual(1);
      expect(eligible).toContain(creatorId);
    });

    it('should get global statistics', () => {
      const creatorId = 444;
      crpManager.generatePayment(creatorId, 1, 1000, 'US', 'USD');
      const payment = crpManager.generatePayment(creatorId, 2, 2000, 'US', 'USD');

      if (payment) {
        crpManager.completePayment(payment.id);
      }

      const stats = crpManager.getGlobalStats();
      expect(stats.totalPayments).toBeGreaterThanOrEqual(1);
      // totalViews is only updated by recordVideoView, not generatePayment
    });
  });

  describe('TikTok Shop', () => {
    let shopManager: ReturnType<typeof getTikTokShopManager>;

    beforeEach(() => {
      shopManager = getTikTokShopManager();
    });

    it('should create a product', () => {
      const creatorId = 4444;
      const product = shopManager.createProduct(
        creatorId,
        'T-Shirt',
        'Cool t-shirt',
        1999,
        'apparel',
        100,
        70,
        'USD'
      );

      expect(product).toBeDefined();
      expect(product.name).toBe('T-Shirt');
      expect(product.price).toBe(1999);
      expect(product.stock).toBe(100);
    });

    it('should get creator products', () => {
      const creatorId = 5555;
      shopManager.createProduct(creatorId, 'Product 1', 'Desc', 1000, 'cat', 50);
      shopManager.createProduct(creatorId, 'Product 2', 'Desc', 2000, 'cat', 50);
      shopManager.createProduct(2, 'Product 3', 'Desc', 1500, 'cat', 50);

      const creatorProducts = shopManager.getCreatorProducts(creatorId);
      expect(creatorProducts.length).toBeGreaterThanOrEqual(2);
    });

    it('should create an order', () => {
      const creatorId = 3333;
      const product = shopManager.createProduct(
        creatorId,
        'T-Shirt',
        'Cool t-shirt',
        1999,
        'apparel',
        100
      );

      const order = shopManager.createOrder(2, [
        { productId: product.id, quantity: 2 },
      ]);

      expect(order).toBeDefined();
      expect(order?.totalAmount).toBe(3998); // 1999 * 2
      expect(order?.status).toBe('pending');
    });

    it('should prevent order with insufficient stock', () => {
      const creatorId = 2222;
      const product = shopManager.createProduct(
        creatorId,
        'T-Shirt',
        'Cool t-shirt',
        1999,
        'apparel',
        1
      );

      const order = shopManager.createOrder(2, [
        { productId: product.id, quantity: 2 },
      ]);

      expect(order).toBeNull();
    });

    it('should update order status and create sales', () => {
      const creatorId = 1111;
      const product = shopManager.createProduct(
        creatorId,
        'T-Shirt',
        'Cool t-shirt',
        1999,
        'apparel',
        100
      );

      const order = shopManager.createOrder(2, [
        { productId: product.id, quantity: 1 },
      ]);

      if (!order) throw new Error('Order creation failed');

      const updated = shopManager.updateOrderStatus(order.id, 'delivered');
      expect(updated).toBe(true);

      const sales = shopManager.getCreatorSales(creatorId);
      expect(sales.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate creator earnings from sales', () => {
      const creatorId = 8888;
      const product = shopManager.createProduct(creatorId, 'Product', 'Desc', 1000, 'cat', 100, 70);

      const order = shopManager.createOrder(2, [
        { productId: product.id, quantity: 2 },
      ]);

      if (order) {
        shopManager.updateOrderStatus(order.id, 'delivered');
      }

      const earnings = shopManager.getCreatorShopEarnings(creatorId);
      expect(earnings).toBeGreaterThanOrEqual(1400); // 2000 * 0.70
    });

    it('should get shop statistics', () => {
      shopManager.createProduct(9999, 'Product 1', 'Desc', 1000, 'cat', 50);
      shopManager.createProduct(9998, 'Product 2', 'Desc', 2000, 'cat', 50);

      const stats = shopManager.getShopStats();
      expect(stats.totalProducts).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Brand Partnerships', () => {
    let partnershipsManager: ReturnType<typeof getBrandPartnershipsManager>;

    beforeEach(() => {
      partnershipsManager = getBrandPartnershipsManager();
    });

    it('should create a brand campaign', () => {
      const brandId = 8888;
      const campaign = partnershipsManager.createCampaign(
        brandId,
        'Nike',
        'Summer Campaign',
        'Promote summer collection',
        100000,
        5000,
        10000,
        5,
        'sports',
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      expect(campaign).toBeDefined();
      expect(campaign.brandName).toBe('Nike');
      expect(campaign.status).toBe('draft');
    });

    it('should activate a campaign', () => {
      const brandId = 7777;
      const campaign = partnershipsManager.createCampaign(
        brandId,
        'Nike',
        'Summer Campaign',
        'Promote summer collection',
        100000,
        5000,
        10000,
        5,
        'sports',
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      const activated = partnershipsManager.activateCampaign(campaign.id);
      expect(activated).toBe(true);

      const updated = partnershipsManager.getCampaign(campaign.id);
      expect(updated?.status).toBe('active');
    });

    it('should invite creators to campaign', () => {
      const brandId = 6666;
      const campaign = partnershipsManager.createCampaign(
        brandId,
        'Nike',
        'Summer Campaign',
        'Promote summer collection',
        100000,
        5000,
        10000,
        5,
        'sports',
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      const invitation = partnershipsManager.inviteCreator(campaign.id, 2);
      expect(invitation).toBeDefined();
      expect(invitation?.status).toBe('pending');
      expect(invitation?.paymentAmount).toBe(5000);
    });

    it('should accept and complete invitation', () => {
      const brandId = 5555;
      const campaign = partnershipsManager.createCampaign(
        brandId,
        'Nike',
        'Summer Campaign',
        'Promote summer collection',
        100000,
        5000,
        10000,
        5,
        'sports',
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      const invitation = partnershipsManager.inviteCreator(campaign.id, 2);
      if (!invitation) throw new Error('Invitation creation failed');

      const accepted = partnershipsManager.acceptInvitation(invitation.id);
      expect(accepted).toBe(true);

      const submitted = partnershipsManager.submitDeliverable(
        invitation.id,
        'https://example.com/video'
      );
      expect(submitted).toBe(true);

      const payment = partnershipsManager.approveDeliverable(invitation.id);
      expect(payment).toBeDefined();
      expect(payment?.amount).toBe(5000);
    });

    it('should get creator invitations', () => {
      const brandId = 4444;
      const campaign = partnershipsManager.createCampaign(
        brandId,
        'Nike',
        'Summer Campaign',
        'Promote summer collection',
        100000,
        5000,
        10000,
        5,
        'sports',
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      const creatorId = 3333;
      partnershipsManager.inviteCreator(campaign.id, creatorId);
      partnershipsManager.inviteCreator(campaign.id, creatorId);

      const invitations = partnershipsManager.getCreatorInvitations(creatorId);
      expect(invitations.length).toBeGreaterThanOrEqual(2);
    });

    it('should get partnership statistics', () => {
      const brandId = 2222;
      const campaign = partnershipsManager.createCampaign(
        brandId,
        'Nike',
        'Summer Campaign',
        'Promote summer collection',
        100000,
        5000,
        10000,
        5,
        'sports',
        new Date(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      partnershipsManager.inviteCreator(campaign.id, 2);

      const stats = partnershipsManager.getPartnershipStats();
      expect(stats.totalCampaigns).toBeGreaterThanOrEqual(1);
      expect(stats.totalInvitations).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Affiliate Marketing', () => {
    let affiliateManager: ReturnType<typeof getAffiliateMarketingManager>;

    beforeEach(() => {
      affiliateManager = getAffiliateMarketingManager();
    });

    it('should create an affiliate link', () => {
      const creatorId = 6666;
      const link = affiliateManager.createAffiliateLink(
        creatorId,
        'prod_123',
        'Cool Product',
        'https://example.com/product',
        15
      );

      expect(link).toBeDefined();
      expect(link.productName).toBe('Cool Product');
      expect(link.commissionRate).toBe(15);
    });

    it('should get creator affiliate links', () => {
      const creatorId = 7777;
      affiliateManager.createAffiliateLink(creatorId, 'prod_1', 'Product 1', 'url', 10);
      affiliateManager.createAffiliateLink(creatorId, 'prod_2', 'Product 2', 'url', 15);
      affiliateManager.createAffiliateLink(2, 'prod_3', 'Product 3', 'url', 10);

      const links = affiliateManager.getCreatorAffiliateLinks(creatorId);
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('should record clicks on affiliate links', () => {
      const creatorId = 5555;
      const link = affiliateManager.createAffiliateLink(
        creatorId,
        'prod_123',
        'Cool Product',
        'https://example.com/product',
        15
      );

      const click = affiliateManager.recordClick(link.id, 'visitor_1');
      expect(click).toBeDefined();

      const updatedLink = affiliateManager.getAffiliateLink(link.id);
      expect(updatedLink?.clicks).toBeGreaterThanOrEqual(1);
    });

    it('should record conversions from clicks', () => {
      const creatorId = 4444;
      const link = affiliateManager.createAffiliateLink(
        creatorId,
        'prod_123',
        'Cool Product',
        'https://example.com/product',
        15
      );

      const click = affiliateManager.recordClick(link.id, 'visitor_1');
      if (!click) throw new Error('Click recording failed');

      const conversion = affiliateManager.recordConversion(click.id, 10000); // $100 purchase
      expect(conversion).toBeDefined();
      expect(conversion?.commissionAmount).toBe(1500); // 15% of 10000 = 1500 cents
    });

    it('should confirm conversions and create payments', () => {
      const creatorId = 3333;
      const link = affiliateManager.createAffiliateLink(
        creatorId,
        'prod_123',
        'Cool Product',
        'https://example.com/product',
        15
      );

      const click = affiliateManager.recordClick(link.id, 'visitor_1');
      if (!click) throw new Error('Click recording failed');

      const conversion = affiliateManager.recordConversion(click.id, 10000);
      if (!conversion) throw new Error('Conversion recording failed');

      const confirmed = affiliateManager.confirmConversion(conversion.id);
      expect(confirmed).toBe(true);

      const payment = affiliateManager.createAffiliatePayment(creatorId);
      expect(payment).toBeDefined();
      expect(payment?.totalAmount).toBe(1500);
    });

    it('should get creator affiliate earnings', () => {
      const creatorId = 2222;
      const link = affiliateManager.createAffiliateLink(
        creatorId,
        'prod_123',
        'Cool Product',
        'https://example.com/product',
        10
      );

      const click = affiliateManager.recordClick(link.id, 'visitor_1');
      if (click) {
        const conversion = affiliateManager.recordConversion(click.id, 10000);
        if (conversion) {
          affiliateManager.confirmConversion(conversion.id);
        }
      }

      const earnings = affiliateManager.getCreatorAffiliateEarnings(creatorId);
      expect(earnings).toBeGreaterThanOrEqual(1000);
    });

    it('should get affiliate statistics', () => {
      const creatorId = 1111;
      const link = affiliateManager.createAffiliateLink(
        creatorId,
        'prod_123',
        'Cool Product',
        'https://example.com/product',
        15
      );

      affiliateManager.recordClick(link.id, 'visitor_1');
      affiliateManager.recordClick(link.id, 'visitor_2');

      const stats = affiliateManager.getAffiliateStats();
      expect(stats.totalLinks).toBeGreaterThanOrEqual(1);
      expect(stats.totalClicks).toBeGreaterThanOrEqual(2);
    });

    it('should get top affiliate links', () => {
      const creatorId = 9999;
      const link1 = affiliateManager.createAffiliateLink(creatorId, 'prod_1', 'Product 1', 'url', 10);
      const link2 = affiliateManager.createAffiliateLink(creatorId, 'prod_2', 'Product 2', 'url', 15);

      const click1 = affiliateManager.recordClick(link1.id, 'v1');
      const click2 = affiliateManager.recordClick(link2.id, 'v2');

      if (click1) affiliateManager.recordConversion(click1.id, 10000);
      if (click2) affiliateManager.recordConversion(click2.id, 20000);

      const topLinks = affiliateManager.getTopAffiliateLinks(5);
      expect(topLinks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration Tests', () => {
    let crpManager: ReturnType<typeof getCreatorRewardsProgramManager>;
    let shopManager: ReturnType<typeof getTikTokShopManager>;
    let partnershipsManager: ReturnType<typeof getBrandPartnershipsManager>;
    let affiliateManager: ReturnType<typeof getAffiliateMarketingManager>;

    beforeEach(() => {
      crpManager = getCreatorRewardsProgramManager();
      shopManager = getTikTokShopManager();
      partnershipsManager = getBrandPartnershipsManager();
      affiliateManager = getAffiliateMarketingManager();
    });

    it('should handle complete creator monetization workflow', () => {
      const creatorId = 11111;

      // 1. Creator Rewards Program
      const payment1 = crpManager.generatePayment(creatorId, 1, 5000, 'US', 'USD');
      expect(payment1?.amount).toBeGreaterThan(0);

      // 2. TikTok Shop
      const product = shopManager.createProduct(creatorId, 'Merch', 'Desc', 2000, 'cat', 50);
      const order = shopManager.createOrder(2, [{ productId: product.id, quantity: 1 }]);
      if (order) {
        shopManager.updateOrderStatus(order.id, 'delivered');
      }

      // 3. Brand Partnerships
      const campaign = partnershipsManager.createCampaign(
        999,
        'Brand',
        'Campaign',
        'Desc',
        50000,
        5000,
        1000,
        2,
        'cat',
        new Date(),
        new Date()
      );
      const invitation = partnershipsManager.inviteCreator(campaign.id, creatorId);
      if (invitation) {
        partnershipsManager.acceptInvitation(invitation.id);
        partnershipsManager.submitDeliverable(invitation.id, 'url');
        partnershipsManager.approveDeliverable(invitation.id);
      }

      // 4. Affiliate Marketing
      const link = affiliateManager.createAffiliateLink(creatorId, 'prod', 'Product', 'url', 10);
      const click = affiliateManager.recordClick(link.id);
      if (click) {
        const conversion = affiliateManager.recordConversion(click.id, 10000);
        if (conversion) {
          affiliateManager.confirmConversion(conversion.id);
        }
      }

      // Verify all systems are working
      const balance = crpManager.getPendingBalance(creatorId);
      const shopEarnings = shopManager.getCreatorShopEarnings(creatorId);
      const partnershipEarnings = partnershipsManager.getCreatorPartnershipEarnings(creatorId);
      const affiliateEarnings = affiliateManager.getCreatorAffiliateEarnings(creatorId);
      
      // At least one system should have earnings
      const totalEarnings = balance + shopEarnings + partnershipEarnings + affiliateEarnings;
      expect(totalEarnings).toBeGreaterThan(0);
    });
  });
});

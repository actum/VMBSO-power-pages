/**
 * Custom hook for fetching news articles via FetchXML.
 * A single query resolves the M2M brand relationship via the intersect table
 * (actum_newspagecontent_actum_brand), returning one row per article-brand pair.
 * Results are deduplicated client-side into NewsArticle objects with a brands array.
 *
 * Articles are filtered by the current user's language (contact), country and role (account).
 * Fields with a null value on the article are treated as "applies to all".
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import { config } from '../config/powerPages.config';
import { NewsArticle } from '../types/newsArticle';
import { useAuth } from '../contexts/AuthContext';
import { dataverseService } from '../services/dataverseService';

// ---------------------------------------------------------------------------
// Mock data (dev mode only)
// ---------------------------------------------------------------------------

export const DEV_MOCK_ARTICLES: NewsArticle[] = [
  {
    actum_newspagecontentid: 'news-001',
    actum_name: 'Loyalty Program Announcement',
    actum_title: 'Loyalty program 2025 — earn points and unlock exclusive benefits',
    actum_summary:
      'The VMZINC loyalty program has been updated for 2025. New reward tiers, voucher redemption via the partner portal, and a referral bonus for partners who onboard new certified installers.',
    actum_body: `
      <p>Dear partner, we are pleased to introduce the updated VMZINC Loyalty Program for 2025. This year we have extended the reward structure to better recognise the long-term commitment of our certified installers and distributors across all markets.</p>
      <h2>How it works</h2>
      <p>Points are earned automatically on every qualifying purchase registered through your partner account. At the end of each quarter, your tier status is updated accordingly.</p>
      <ul>
        <li><strong>Bronze</strong> — from 500 points: priority access to new product samples</li>
        <li><strong>Silver</strong> — from 1,500 points: dedicated technical support line + 15% training discount</li>
        <li><strong>Gold</strong> — from 3,000 points: co-marketing budget + invitation to annual partner event</li>
      </ul>
      <h2>Vouchers and redemption</h2>
      <p>Starting Q2 2025, points can be redeemed as vouchers directly in the partner portal. Vouchers are valid for 12 months from the date of issue and can be applied to any qualifying order.</p>
    `,
    actum_publishdate: '2026-01-15T00:00:00Z',
    actum_ctahint: 'Ready to get started? Access the full loyalty portal and register your purchases.',
    actum_ctalabel: 'Join the program →',
    actum_ctaurl: '/documents',
    createdon: '2026-01-14T10:00:00Z',
    statecode: 0,
    brands: [{ id: 'brand-vmzinc', name: 'VMZINC' }],
  },
  {
    actum_newspagecontentid: 'news-002',
    actum_name: 'Resitrix Spring Newsletter 2025',
    actum_title: 'Spring Newsletter 2025 — New EPDM product range',
    actum_summary:
      'We are pleased to announce the launch of our updated EPDM waterproofing range. Key improvements include enhanced UV resistance, a wider colour palette, and a simplified installation process that reduces average time on site by up to 20%.',
    actum_body: `
      <p>We are pleased to announce the launch of our updated EPDM waterproofing range. Key improvements include enhanced UV resistance, a wider colour palette, and a simplified installation process that reduces average time on site by up to 20%.</p>
      <h2>New products</h2>
      <ul>
        <li>Resitrix SK W Full Bond — now available in 3 m width</li>
        <li>Resitrix SK Partial Bond — updated adhesive formulation</li>
        <li>Resitrix MB — new lightweight variant for refurbishment projects</li>
      </ul>
      <h2>Updated documentation</h2>
      <p>All technical data sheets and DOP certificates have been updated. Please download the latest versions from the Documents section and replace any previously issued materials.</p>
    `,
    actum_publishdate: '2026-03-12T00:00:00Z',
    actum_ctahint: 'Download the full Spring 2025 product overview.',
    actum_ctalabel: 'Go to Documents →',
    actum_ctaurl: '/documents',
    createdon: '2026-03-11T09:00:00Z',
    statecode: 0,
    brands: [{ id: 'brand-resitrix', name: 'Resitrix' }],
  },
  {
    actum_newspagecontentid: 'news-003',
    actum_name: 'Mastersystems Training Dates 2025',
    actum_title: 'Mastersystems pre-tape training schedule — book your place now',
    actum_summary:
      'The 2025 Mastersystems product training calendar is now live. Sessions cover application techniques, substrate assessment, and the new 3.05 m wide format tape. Places are limited — register early to secure your preferred date.',
    actum_body: `
      <p>Our technical training team has confirmed the 2025 schedule for Mastersystems pre-applied self-adhesive tape training. Sessions are held at our regional training centres and are open to all certified Mastersystems installers and their teams.</p>
      <h2>What is covered</h2>
      <ul>
        <li>Substrate assessment and surface preparation requirements</li>
        <li>Application of the 2.2 mm and 3.05 m × 15.25 m formats</li>
        <li>Seam overlaps, terminations, and detailing at penetrations</li>
        <li>Common installation errors and how to avoid them</li>
      </ul>
      <h2>How to register</h2>
      <p>Contact your regional Mastersystems account manager or use the training registration form in the partner portal. Sessions run from March through November with availability in NL, BE, FR, and DE.</p>
    `,
    actum_publishdate: '2026-02-20T00:00:00Z',
    createdon: '2026-02-19T14:00:00Z',
    statecode: 0,
    brands: [{ id: 'brand-mastersystems', name: 'Mastersystems' }],
  },
  {
    actum_newspagecontentid: 'news-004',
    actum_name: 'Partner Portal Update — Invoices',
    actum_title: 'Partner portal update — invoices and order history now available online',
    actum_summary:
      'The partner portal has been updated with a new Invoices section. You can now download PDF invoices, view order history going back 24 months, and export transaction data for your accounting systems.',
    actum_body: `
      <p>We have rolled out a major update to the partner portal. The new Invoices & Orders section gives all active partners self-service access to their full transaction history without needing to contact your account manager.</p>
      <h2>What is new</h2>
      <ul>
        <li>Download PDF invoices for any order placed in the last 24 months</li>
        <li>Filter orders by date range, brand, or reference number</li>
        <li>Export order lines to CSV for use in your ERP or accounting software</li>
        <li>Credit note history included alongside standard invoices</li>
      </ul>
      <h2>Access</h2>
      <p>The Invoices section is available immediately under My Account in the partner portal. If you experience any access issues, please contact your account manager or our portal support team.</p>
    `,
    actum_publishdate: '2026-03-10T00:00:00Z',
    createdon: '2026-03-09T11:00:00Z',
    statecode: 0,
    brands: [
      { id: 'brand-vmzinc', name: 'VMZINC' },
      { id: 'brand-resitrix', name: 'Resitrix' },
      { id: 'brand-mastersystems', name: 'Mastersystems' },
    ],
  },
];

// ---------------------------------------------------------------------------
// FetchXML builder
// ---------------------------------------------------------------------------

/** Raw row returned by FetchXML — one row per article × brand pair */
interface RawNewsRow {
  actum_newspagecontentid: string;
  actum_title: string;
  actum_summary?: string;
  actum_body?: string;
  actum_publishdate?: string;
  actum_ctahint?: string;
  actum_ctalabel?: string;
  actum_ctaurl?: string;
  createdon: string;
  statecode: number;
  /** Aliased brand fields from the outer-joined actum_brand link-entity */
  'brand.actum_brandid'?: string;
  'brand.actum_name'?: string;
}

/**
 * Build a FetchXML string that fetches active news articles with their brands.
 * Filters on language / country / role are added only when the GUID is available;
 * null fields on the article are treated as "applies to all" via an OR condition.
 */
function buildNewsFetchXml(
  languageId?: string,
  countryId?: string,
  roleId?: string,
): string {
  const maybeFilter = (attr: string, guid?: string) =>
    guid
      ? `<filter type="or">
          <condition attribute="${attr}" operator="null"/>
          <condition attribute="${attr}" operator="eq" value="${guid}"/>
        </filter>`
      : '';

  return `<fetch>
  <entity name="actum_newspagecontent">
    <attribute name="actum_newspagecontentid"/>
    <attribute name="actum_title"/>
    <attribute name="actum_summary"/>
    <attribute name="actum_body"/>
    <attribute name="actum_publishdate"/>
    <attribute name="actum_ctahint"/>
    <attribute name="actum_ctalabel"/>
    <attribute name="actum_ctaurl"/>
    <attribute name="createdon"/>
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0"/>
      ${maybeFilter('actum_languageid', languageId)}
      ${maybeFilter('actum_countryid', countryId)}
      ${maybeFilter('actum_roleid', roleId)}
    </filter>
    <link-entity name="actum_newspagecontent_actum_brandset" from="actum_newspagecontentid" to="actum_newspagecontentid" link-type="outer" intersect="true">
      <link-entity name="actum_brand" from="actum_brandid" to="actum_brandid" link-type="outer" alias="brand">
        <attribute name="actum_brandid"/>
        <attribute name="actum_name"/>
      </link-entity>
    </link-entity>
    <order attribute="actum_publishdate" descending="true"/>
  </entity>
</fetch>`;
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateArticles(rows: RawNewsRow[]): NewsArticle[] {
  const map = new Map<string, NewsArticle>();

  rows.forEach(row => {
    const id = row.actum_newspagecontentid;
    const brandId = row['brand.actum_brandid'];
    const brandName = row['brand.actum_name'];

    if (map.has(id)) {
      const existing = map.get(id)!;
      if (brandId && !existing.brands.find(b => b.id === brandId)) {
        existing.brands.push({ id: brandId, name: brandName ?? '' });
      }
    } else {
      const brands: { id: string; name: string }[] = [];
      if (brandId) brands.push({ id: brandId, name: brandName ?? '' });

      map.set(id, {
        actum_newspagecontentid: id,
        actum_name: row.actum_title,
        actum_title: row.actum_title,
        actum_summary: row.actum_summary,
        actum_body: row.actum_body,
        actum_publishdate: row.actum_publishdate,
        actum_ctahint: row.actum_ctahint,
        actum_ctalabel: row.actum_ctalabel,
        actum_ctaurl: row.actum_ctaurl,
        createdon: row.createdon,
        statecode: row.statecode,
        brands,
      });
    }
  });

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useNews = () => {
  const { currentUser } = useAuth();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    if (config.devMode) {
      setArticles(DEV_MOCK_ARTICLES);
      setLoading(false);
      return;
    }

    if (!currentUser?.contactid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Language comes from the contact
      const languageId = currentUser._actum_languageid_value?.replace(/[{}]/g, '');

      // Country + role come from the linked account
      let countryId: string | undefined;
      let roleId: string | undefined;

      if (currentUser._parentcustomerid_value) {
        const account = await dataverseService.accounts.getById(
          currentUser._parentcustomerid_value,
        );
        countryId = account?._actum_primarycountryid_value?.replace(/[{}]/g, '');
        roleId = account?._actum_roleid_value?.replace(/[{}]/g, '');
      }

      const fetchXml = buildNewsFetchXml(languageId, countryId, roleId);
      const response = await apiClient.odata<{ value: RawNewsRow[] }>(
        `/actum_newspagecontents?fetchXml=${encodeURIComponent(fetchXml)}`,
      );

      setArticles(deduplicateArticles(response.value ?? []));
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status)) {
        // Session errors are handled globally — don't show an error banner
        setArticles([]);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load news';
        setError(message);
        setArticles([]);
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentUser?.contactid,
    currentUser?._actum_languageid_value,
    currentUser?._parentcustomerid_value,
  ]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, loading, error, refetch: fetchArticles };
};

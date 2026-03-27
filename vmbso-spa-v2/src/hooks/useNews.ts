/**
 * Custom hook for fetching news articles.
 * Supports two query strategies — toggle USE_ODATA below to switch:
 *   false → FetchXML  (current default, works with WAF restrictions)
 *   true  → OData $expand (cleaner, but requires correct N:N nav-prop names in Dataverse)
 *
 * Brand is resolved via the M2M actum_newspagecontent_actum_brand intersect.
 * Articles are filtered by the current user's language (contact), country and
 * role (account). A null value on the article means "applies to all".
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '../services/apiClient';
import { config } from '../config/powerPages.config';
import type { NewsArticle } from '../types/newsArticle';
import { useAuth } from '../contexts/AuthContext';
import { dataverseService } from '../services/dataverseService';

// ---------------------------------------------------------------------------
// Strategy switcher
// ---------------------------------------------------------------------------

/**
 * Set to true to use OData $expand queries instead of FetchXML.
 * OData requires correct N:N navigation property names — verify them in
 * Dataverse > actum_newspagecontent > Relationships before enabling.
 */
const USE_ODATA = true;

// ---------------------------------------------------------------------------
// Mock data (dev mode only)
// ---------------------------------------------------------------------------

export const DEV_MOCK_ARTICLES: NewsArticle[] = [
  {
    actum_newspagecontentid: 'news-001',
    actum_name: 'Loyalty Program Announcement',
    actum_title: 'Loyalty program 2025 — earn points and unlock exclusive benefits',
    actum_summary:
    '<div class="ck-content" data-wrapper="true" dir="ltr" style="--ck-image-style-spacing: 1.5em; --ck-inline-image-style-spacing: calc(var(--ck-image-style-spacing) / 2); font-family: Segoe UI; font-size: 11pt;"><p style="margin: 0;">The VMZINC loyalty program has been updated for 2025. New reward tiers, voucher redemption via the partner portal, and a referral bonus for partners who onboard new certified installers.</p></div>',
    actum_body: `
      <p>Dear partner, we are pleased to introduce the updated VMZINC Loyalty Program for 2025. This year we have extended the reward structure to better recognise the long-term commitment of our certified installers and distributors across all markets.</p>
      <h2>How it works</h2>
      <p>Points are earned automatically on every qualifying purchase registered through your partner account. At the end of each quarter, your tier status is updated accordingly.</p>
      <ul>
        <li><strong>Bronze</strong> — from 500 points: priority access to new product samples</li>
        <li><strong>Silver</strong> — from 1,500 points: dedicated technical support line + 15% training discount</li>
        <li><strong>Gold</strong> — from 3,000 points: co-marketing budget + invitation to annual partner event</li>
      </ul>
    `,
    actum_publishdate: '2026-01-15T00:00:00Z',
    createdon: '2026-01-14T10:00:00Z',
    statecode: 0,
    brands: [{ id: 'brand-vmzinc', name: 'VMZINC' }],
    ctas: [
      { id: 'cta-001', text: 'Join the program', url: '/documents', target: 182980000 },
    ],
  },
  {
    actum_newspagecontentid: 'news-002',
    actum_name: 'Resitrix Spring Newsletter 2025',
    actum_title: 'Spring Newsletter 2025 — New EPDM product range',
    actum_summary:
      'We are pleased to announce the launch of our updated EPDM waterproofing range. Key improvements include enhanced UV resistance, a wider colour palette, and a simplified installation process that reduces average time on site by up to 20%.',
    actum_body: `
      <p>We are pleased to announce the launch of our updated EPDM waterproofing range.</p>
      <h2>New products</h2>
      <ul>
        <li>Resitrix SK W Full Bond — now available in 3 m width</li>
        <li>Resitrix SK Partial Bond — updated adhesive formulation</li>
        <li>Resitrix MB — new lightweight variant for refurbishment projects</li>
      </ul>
    `,
    actum_publishdate: '2026-03-12T00:00:00Z',
    createdon: '2026-03-11T09:00:00Z',
    statecode: 0,
    brands: [{ id: 'brand-resitrix', name: 'Resitrix' }],
    ctas: [
      { id: 'cta-002', text: 'Go to Documents', url: '/documents', target: 182980000 },
    ],
  },
  {
    actum_newspagecontentid: 'news-003',
    actum_name: 'Mastersystems Training Dates 2025',
    actum_title: 'Mastersystems pre-tape training schedule — book your place now',
    actum_summary:
      'The 2025 Mastersystems product training calendar is now live. Sessions cover application techniques, substrate assessment, and the new 3.05 m wide format tape.',
    actum_body: `
      <p>Our technical training team has confirmed the 2025 schedule for Mastersystems pre-applied self-adhesive tape training.</p>
      <h2>What is covered</h2>
      <ul>
        <li>Substrate assessment and surface preparation requirements</li>
        <li>Application of the 2.2 mm and 3.05 m × 15.25 m formats</li>
        <li>Seam overlaps, terminations, and detailing at penetrations</li>
      </ul>
    `,
    actum_publishdate: '2026-02-20T00:00:00Z',
    createdon: '2026-02-19T14:00:00Z',
    statecode: 0,
    brands: [{ id: 'brand-mastersystems', name: 'Mastersystems' }],
    ctas: [],
  },
  {
    actum_newspagecontentid: 'news-004',
    actum_name: 'Partner Portal Update — Invoices',
    actum_title: 'Partner portal update — invoices and order history now available online',
    actum_summary:
      'The partner portal has been updated with a new Invoices section. You can now download PDF invoices, view order history going back 24 months, and export transaction data for your accounting systems.',
    actum_body: `
      <p>We have rolled out a major update to the partner portal.</p>
      <h2>What is new</h2>
      <ul>
        <li>Download PDF invoices for any order placed in the last 24 months</li>
        <li>Filter orders by date range, brand, or reference number</li>
        <li>Export order lines to CSV for use in your ERP or accounting software</li>
      </ul>
    `,
    actum_publishdate: '2026-03-10T00:00:00Z',
    createdon: '2026-03-09T11:00:00Z',
    statecode: 0,
    brands: [{ id: 'brand-vmzinc', name: 'VMZINC' }],
    ctas: [],
  },
];

// ---------------------------------------------------------------------------
// FetchXML — types, queries, deduplication
// ---------------------------------------------------------------------------

/** Raw row from the CTA FetchXML — one row per article×CTA pair */
interface RawCtaRow {
  actum_newspagecontentid: string;
  'cta.actum_calltoactionbuttonid'?: string;
  'cta.actum_ctatext'?: string;
  'cta.actum_ctaurl'?: string;
  'cta.actum_ctatarget'?: number;
}

const CTA_FETCH_XML = `<fetch>
  <entity name="actum_newspagecontent">
    <attribute name="actum_newspagecontentid"/>
    <filter>
      <condition attribute="statecode" operator="eq" value="0"/>
    </filter>
    <link-entity name="actum_calltoactionbutton_actum_newspage" from="actum_newspagecontentid" to="actum_newspagecontentid" link-type="inner" intersect="true">
      <link-entity name="actum_calltoactionbutton" from="actum_calltoactionbuttonid" to="actum_calltoactionbuttonid" link-type="inner" alias="cta">
        <attribute name="actum_calltoactionbuttonid"/>
        <attribute name="actum_ctatext"/>
        <attribute name="actum_ctaurl"/>
        <attribute name="actum_ctatarget"/>
        <filter>
          <condition attribute="statecode" operator="eq" value="0"/>
        </filter>
      </link-entity>
    </link-entity>
  </entity>
</fetch>`;

/** Raw row returned by FetchXML — one row per article × brand × role combination */
interface RawNewsRow {
  actum_newspagecontentid: string;
  actum_name: string;
  actum_title: string;
  actum_summary?: string;
  actum_body?: string;
  actum_publishdate?: string;
  createdon: string;
  statecode: number;
  /** Brand fields from the outer-joined actum_brand link-entity */
  'brand.actum_brandid'?: string;
  'brand.actum_name'?: string;
  /** Role fields from the outer-joined actum_role link-entity */
  'role.actum_roleid'?: string;
}

/**
 * Build FetchXML to fetch active news articles with brands (M2M) and roles (M2M).
 * Language / country are M2O inline filters (null = show to all).
 * Role is M2M — outer-joined and post-filtered client-side.
 */
function buildNewsFetchXml(
  languageId?: string,
  countryId?: string,
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
    <attribute name="actum_name"/>
    <attribute name="actum_title"/>
    <attribute name="actum_summary"/>
    <attribute name="actum_body"/>
    <attribute name="actum_publishdate"/>
    <attribute name="createdon"/>
    <filter type="and">
      <condition attribute="statecode" operator="eq" value="0"/>
      ${maybeFilter('actum_languageid', languageId)}
      ${maybeFilter('actum_countryid', countryId)}
    </filter>
    <link-entity name="actum_newspagecontent_actum_brand" from="actum_newspagecontentid" to="actum_newspagecontentid" link-type="outer" intersect="true">
      <link-entity name="actum_brand" from="actum_brandid" to="actum_brandid" link-type="outer" alias="brand">
        <attribute name="actum_brandid"/>
        <attribute name="actum_name"/>
      </link-entity>
    </link-entity>
    <link-entity name="actum_newspagecontent_actum_role" from="actum_newspagecontentid" to="actum_newspagecontentid" link-type="outer" intersect="true">
      <link-entity name="actum_role" from="actum_roleid" to="actum_roleid" link-type="outer" alias="role">
        <attribute name="actum_roleid"/>
      </link-entity>
    </link-entity>
    <order attribute="actum_publishdate" descending="true"/>
  </entity>
</fetch>`;
}

// ---------------------------------------------------------------------------
// Deduplication — one row per article×brand×role → grouped by article
// ---------------------------------------------------------------------------

function deduplicateArticles(rows: RawNewsRow[]): {
  articles: NewsArticle[];
  roleIds: Map<string, string[]>;
} {
  const map = new Map<string, NewsArticle>();
  const roleMap = new Map<string, Set<string>>();

  rows.forEach(row => {
    const id = row.actum_newspagecontentid;
    const brandId = row['brand.actum_brandid'];
    const brandName = row['brand.actum_name'];
    const roleId = row['role.actum_roleid'];

    if (map.has(id)) {
      const existing = map.get(id)!;
      if (brandId && !existing.brands.find(b => b.id === brandId)) {
        existing.brands.push({ id: brandId, name: brandName ?? '' });
      }
      if (roleId) roleMap.get(id)!.add(roleId);
    } else {
      const brands: { id: string; name: string }[] = [];
      if (brandId) brands.push({ id: brandId, name: brandName ?? '' });

      const roles = new Set<string>();
      if (roleId) roles.add(roleId);
      roleMap.set(id, roles);

      map.set(id, {
        actum_newspagecontentid: id,
        actum_name: row.actum_name,
        actum_title: row.actum_title,
        actum_summary: row.actum_summary,
        actum_body: row.actum_body,
        actum_publishdate: row.actum_publishdate,
        createdon: row.createdon,
        statecode: row.statecode,
        brands,
        ctas: [],
      });
    }
  });

  return {
    articles: Array.from(map.values()),
    roleIds: new Map(Array.from(roleMap.entries()).map(([id, set]) => [id, Array.from(set)])),
  };
}

// ---------------------------------------------------------------------------
// OData — types, queries, mapper
// ---------------------------------------------------------------------------

/**
 * N:N navigation property names on actum_newspagecontent — verified from Dataverse.
 */
const CTA_NAV_PROP   = 'actum_CallToActionButton_actum_NewsPageContent_actum_NewsPageContent';
const BRAND_NAV_PROP = 'actum_NewsPageContent_actum_brand_actum_brand';
const ROLE_NAV_PROP  = 'actum_NewsPageContent_actum_role_actum_role';

interface RawCtaItem {
  actum_calltoactionbuttonid: string;
  actum_ctatext?: string;
  actum_ctaurl?: string;
  actum_ctatarget?: number;
}

/** Row from CTA OData query — one row per article, CTAs nested under CTA_NAV_PROP */
interface RawCtaODataRow {
  actum_newspagecontentid: string;
  [key: string]: RawCtaItem[] | string | undefined;
}

interface RawBrandItem {
  actum_brandid: string;
  actum_name: string;
}

interface RawRoleItem {
  actum_roleid: string;
}

/** Row from news OData query — one row per article, brands/roles nested */
interface RawNewsODataRow {
  actum_newspagecontentid: string;
  actum_name: string;
  actum_title: string;
  actum_summary?: string;
  actum_body?: string;
  actum_publishdate?: string;
  createdon: string;
  statecode: number;
  [key: string]: RawBrandItem[] | RawRoleItem[] | string | number | undefined;
}

/** OData URL for fetching active articles with CTAs expanded */
const CTA_ODATA_URL =
  'actum_newspagecontents'
  + '?$select=actum_newspagecontentid'
  + '&$filter=statecode eq 0'
  + `&$expand=${CTA_NAV_PROP}($select=actum_calltoactionbuttonid,actum_ctatext,actum_ctaurl,actum_ctatarget;$filter=statecode eq 0)`;

/** Build OData URL for articles with brands and roles expanded */
function buildNewsODataUrl(languageId?: string, countryId?: string): string {
  const filters = ['statecode eq 0'];
  if (languageId) {
    filters.push(`(_actum_languageid_value eq null or _actum_languageid_value eq ${languageId})`);
  }
  if (countryId) {
    filters.push(`(_actum_countryid_value eq null or _actum_countryid_value eq ${countryId})`);
  }
  return (
    'actum_newspagecontents'
    + '?$select=actum_newspagecontentid,actum_name,actum_title,actum_summary,actum_body,actum_publishdate,createdon'
    + `&$filter=${filters.join(' and ')}`
    + `&$expand=${BRAND_NAV_PROP}($select=actum_brandid,actum_name),${ROLE_NAV_PROP}($select=actum_roleid)`
    + '&$orderby=actum_publishdate desc'
  );
}

/** Map OData rows (one per article, nested brands/roles) to NewsArticle[] */
function mapToArticles(rows: RawNewsODataRow[]): {
  articles: NewsArticle[];
  roleIds: Map<string, string[]>;
} {
  const articles: NewsArticle[] = rows.map(row => ({
    actum_newspagecontentid: row.actum_newspagecontentid,
    actum_name: row.actum_name,
    actum_title: row.actum_title,
    actum_summary: row.actum_summary,
    actum_body: row.actum_body,
    actum_publishdate: row.actum_publishdate,
    createdon: row.createdon,
    statecode: row.statecode,
    brands: ((row[BRAND_NAV_PROP] ?? []) as RawBrandItem[]).map(b => ({ id: b.actum_brandid, name: b.actum_name })),
    ctas: [],
  }));

  const roleIds = new Map(
    rows.map(row => [
      row.actum_newspagecontentid,
      ((row[ROLE_NAV_PROP] ?? []) as RawRoleItem[]).map(r => r.actum_roleid),
    ]),
  );

  return { articles, roleIds };
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

      // Language from contact
      const languageId = currentUser._actum_languageid_value?.replace(/[{}]/g, '');

      // Country + role + brands from linked account
      let countryId: string | undefined;
      let roleId: string | undefined;
      let brandIds: string[] = [];

      if (currentUser._parentcustomerid_value) {
        const [account, accountBrands] = await Promise.all([
          dataverseService.accounts.getById(currentUser._parentcustomerid_value),
          dataverseService.accounts.getBrands(currentUser._parentcustomerid_value),
        ]);
        countryId = account?._actum_primarycountryid_value?.replace(/[{}]/g, '');
        roleId = account?._actum_roleid_value?.replace(/[{}]/g, '');
        brandIds = accountBrands.map(b => b.actum_brandid);
      }

      const fetchXml = buildNewsFetchXml(languageId, countryId);

      let articles: NewsArticle[];
      let roleIds: Map<string, string[]>;

      if (USE_ODATA) {
        // ── OData path ──────────────────────────────────────────────────────
        const [articlesResponse, ctasResult] = await Promise.all([
          apiClient.odata<{ value: RawNewsODataRow[] }>(
            `/${buildNewsODataUrl(languageId, countryId)}`,
          ),
          apiClient.odata<{ value: RawCtaODataRow[] }>(
            `/${CTA_ODATA_URL}`,
          ).catch(() => ({ value: [] as RawCtaODataRow[] })),
        ]);

        ({ articles, roleIds } = mapToArticles(articlesResponse.value ?? []));

        // Filter by role
        if (roleId) {
          articles = articles.filter(a => {
            const roles = roleIds.get(a.actum_newspagecontentid) ?? [];
            return roles.length === 0 || roles.includes(roleId);
          });
        }

        // Filter by brand — null brands on article = show to all
        if (brandIds.length > 0) {
          articles = articles.filter(a =>
            a.brands.length === 0 || a.brands.some(b => brandIds.includes(b.id))
          );
        }

        // Build CTA lookup map and merge
        const ctaMap = new Map<string, RawCtaItem[]>();
        (ctasResult.value ?? []).forEach(row => {
          const ctas = (row[CTA_NAV_PROP] ?? []) as RawCtaItem[];
          if (ctas.length > 0) ctaMap.set(row.actum_newspagecontentid, ctas);
        });
        articles.forEach(article => {
          const ctas = ctaMap.get(article.actum_newspagecontentid) ?? [];
          article.ctas = ctas.map(cta => ({
            id: cta.actum_calltoactionbuttonid,
            text: cta.actum_ctatext ?? '',
            url: cta.actum_ctaurl ?? '#',
            target: cta.actum_ctatarget ?? 182980000,
          }));
        });
      } else {
        // ── FetchXML path ────────────────────────────────────────────────────
        const [articlesResponse, ctasResult] = await Promise.all([
          apiClient.odata<{ value: RawNewsRow[] }>(
            `/actum_newspagecontents?fetchXml=${encodeURIComponent(fetchXml)}`,
          ),
          apiClient.odata<{ value: RawCtaRow[] }>(
            `/actum_newspagecontents?fetchXml=${encodeURIComponent(CTA_FETCH_XML)}`,
          ).catch(() => ({ value: [] as RawCtaRow[] })),
        ]);

        let deduplicated: NewsArticle[];
        ({ articles: deduplicated, roleIds } = deduplicateArticles(articlesResponse.value ?? []));

        // Filter by role
        articles = roleId
          ? deduplicated.filter(a => {
              const roles = roleIds.get(a.actum_newspagecontentid) ?? [];
              return roles.length === 0 || roles.includes(roleId);
            })
          : deduplicated;

        // Filter by brand — null brands on article = show to all
        if (brandIds.length > 0) {
          articles = articles.filter(a =>
            a.brands.length === 0 || a.brands.some(b => brandIds.includes(b.id))
          );
        }

        // Merge CTAs
        (ctasResult.value ?? []).forEach(row => {
          const article = articles.find(a => a.actum_newspagecontentid === row.actum_newspagecontentid);
          if (article && row['cta.actum_calltoactionbuttonid']) {
            const ctaId = row['cta.actum_calltoactionbuttonid']!;
            if (!article.ctas.find(c => c.id === ctaId)) {
              article.ctas.push({
                id: ctaId,
                text: row['cta.actum_ctatext'] ?? '',
                url: row['cta.actum_ctaurl'] ?? '#',
                target: row['cta.actum_ctatarget'] ?? 182980000,
              });
            }
          }
        });
      }

      setArticles(articles);
    } catch (err) {
      if (err instanceof ApiError && [401, 403].includes(err.status)) {
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

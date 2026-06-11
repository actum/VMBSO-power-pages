/**
 * Homepage UI model consumed by Home.tsx (nested sections + CTAs).
 */
export interface CtaButton {
  text: string;
  url: string;
  target: string;
}

export interface LandingPageCta {
  id: string;
  text: string;
  url: string;
  /** 182980000 = _self, 182980001 = _blank */
  target: number;
}

export interface HeroSection {
  greetingsText: string;
  title: string;
  introText: string;
  ctas: CtaButton[];
  heroImage: {
    url: string;
    alt: string;
  };
}

export interface BannerSection {
  image: {
    url: string;
    alt: string;
  };
  bannerTitle: string;
  bannerImageText: string;
}

export interface HomePageData {
  heroSection: HeroSection;
  bannerSection: BannerSection;
}

/**
 * Raw row from actum_landingpagecontent (Dataverse Web API property names).
 */
export interface LandingPageContent {
  actum_landingpagecontentid: string;
  actum_name?: string;
  actum_greetingstext?: string;
  actum_title?: string;
  actum_introductiontext?: string;
  actum_heroimageurl?: string;
  actum_bannerimageurl?: string;
  actum_bannerimagetext?: string;
  actum_bannertitle?: string;
  _actum_languageid_value?: string;
  _actum_countryid_value?: string;
  _actum_roleid_value?: string;
  _actum_brandid_value?: string;
  statecode?: number;
}

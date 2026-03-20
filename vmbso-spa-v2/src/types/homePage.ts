/**
 * Homepage UI model consumed by Home.tsx (nested sections + CTAs).
 */
export interface CtaButton {
  text: string;
  url: string;
  target: string;
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
  title: string;
  ctas: CtaButton[];
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
  actum_imagealt?: string;
  actum_bannerimageurl?: string;
  actum_bannerimagetext?: string;
  actum_bannertitle?: string;
  _actum_languageid_value?: string;
  statecode?: number;
}

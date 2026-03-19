/**
 * Homepage content types.
 * Structure matches the JSON sent to / received from Dataverse.
 */

export interface HomePageCta {
  url: string;
  text: string;
  target: '_self' | '_blank';
}

export interface HomePageHeroImage {
  url: string;
  alt: string;
}

export interface HomePageHeroSection {
  greetingsText: string;
  title: string;
  introText: string;
  heroImage: HomePageHeroImage;
  ctas: HomePageCta[];
}

export interface HomePageBannerImage {
  url: string;
  alt: string;
}

export interface HomePageBannerSection {
  title: string;
  image: HomePageBannerImage;
  ctas: HomePageCta[];
}

export interface HomePageData {
  heroSection: HomePageHeroSection;
  bannerSection: HomePageBannerSection;
}

# VM Building Solutions - Design Specifications

## Brand Overview
VM Building Solutions is a European leader in building envelope solutions, specializing in zinc (VMZINC), EPDM membranes, and copper (Nordic Copper) products for roofing and facade professionals.

---

## Color Palette

### Primary Colors
```css
/* Main brand colors - based on professional B2B building materials aesthetic */
--primary-dark-blue: #1a3a52;     /* Primary navigation, headers */
--primary-navy: #2c5f7c;          /* Secondary brand color */
--primary-white: #ffffff;         /* Backgrounds, text on dark */
--primary-off-white: #f8f9fa;     /* Alternate backgrounds */
```

### Secondary Colors
```css
/* Material-inspired accent colors */
--zinc-gray: #8b95a0;             /* Reflecting zinc material */
--zinc-light: #b8c0c8;            /* Light zinc accents */
--copper-bronze: #b87333;         /* Copper material accent */
--epdm-black: #2b2b2b;            /* EPDM membrane dark */
--metal-silver: #c0c0c0;          /* Metallic highlights */
```

### Text Colors
```css
--text-primary: #333333;          /* Main body text */
--text-secondary: #666666;        /* Secondary text */
--text-light: #999999;            /* Tertiary text, captions */
--text-on-dark: #ffffff;          /* Text on dark backgrounds */
```

### Utility Colors
```css
--border-color: #e0e0e0;          /* Borders, dividers */
--shadow-color: rgba(0,0,0,0.1);  /* Box shadows */
--hover-blue: #3a7fa8;            /* Interactive hover state */
--success-green: #4a7c59;         /* Success states */
```

---

## Typography

### Font Families
```css
/* Primary font stack - clean, professional sans-serif */
--font-primary: 'Inter', 'Roboto', 'Open Sans', -apple-system, BlinkMacSystemFont, 
                'Segoe UI', 'Helvetica Neue', Arial, sans-serif;

/* Alternative if specific font needed */
--font-secondary: 'Lato', 'Source Sans Pro', sans-serif;

/* Monospace for technical content if needed */
--font-mono: 'Roboto Mono', 'Courier New', monospace;
```

### Font Sizes
```css
/* Type scale */
--text-xs: 0.75rem;      /* 12px - small captions */
--text-sm: 0.875rem;     /* 14px - secondary text */
--text-base: 1rem;       /* 16px - body text */
--text-lg: 1.125rem;     /* 18px - large body */
--text-xl: 1.25rem;      /* 20px - small headings */
--text-2xl: 1.5rem;      /* 24px - h3 */
--text-3xl: 1.875rem;    /* 30px - h2 */
--text-4xl: 2.25rem;     /* 36px - h1 */
--text-5xl: 3rem;        /* 48px - hero headings */
```

### Font Weights
```css
--font-light: 300;
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Line Heights
```css
--leading-tight: 1.25;    /* Headings */
--leading-normal: 1.5;    /* Body text */
--leading-relaxed: 1.75;  /* Large body text */
```

---

## Logo & Branding Assets

### Logo Files
- **Primary Logo**: `/media/shared-images/logo-vmbso.svg`
- **Secondary Logo**: `/media/images/logo-powered-by.svg`
- **Format**: SVG (scalable vector graphics)
- **Style**: Professional, clean, industrial

### Logo Usage Guidelines
- Minimum size: 120px width
- Clear space: Minimum 20px around logo
- Use on white or light backgrounds primarily
- For dark backgrounds, use white/light version

---

## Header & Navigation

### Header Structure
```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]              [NAV LINKS]        [SEARCH] [LANG] │
└─────────────────────────────────────────────────────────┘
```

### Navigation Menu Items
**Primary Navigation:**
- Sustainability (with dropdown)
  - Durable building materials
  - Environment
  - Social
  - Governance
- Solutions (with dropdown)
  - Zinc - VMZINC
  - EPDM membranes
  - Copper - Nordic Copper
- Services
- Training
- About us (with dropdown)
- Discover us (with dropdown)
- Contact
- Portfolio
- Media

### Header Styling
```css
/* Header container */
.header {
  background-color: var(--primary-white);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 4px var(--shadow-color);
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: 1rem 2rem;
}

/* Navigation links */
.nav-link {
  color: var(--text-primary);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  padding: 0.5rem 1rem;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: var(--hover-blue);
}

/* Dropdown menus */
.dropdown {
  background: var(--primary-white);
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 8px var(--shadow-color);
  border-radius: 4px;
}
```

---

## Layout & Grid System

### Container Widths
```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

### Spacing Scale
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-24: 6rem;     /* 96px */
```

### Grid Layout
- Use 12-column grid system
- Gutter width: 24px (1.5rem)
- Responsive breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

---

## Components

### Buttons
```css
/* Primary Button */
.btn-primary {
  background-color: var(--primary-dark-blue);
  color: var(--text-on-dark);
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: var(--font-semibold);
  transition: background-color 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background-color: var(--hover-blue);
}

/* Secondary Button */
.btn-secondary {
  background-color: transparent;
  color: var(--primary-dark-blue);
  border: 2px solid var(--primary-dark-blue);
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: var(--font-semibold);
  transition: all 0.3s ease;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: var(--primary-dark-blue);
  color: var(--text-on-dark);
}

/* Text Link Button */
.btn-link {
  color: var(--hover-blue);
  font-weight: var(--font-medium);
  text-decoration: none;
  transition: color 0.3s ease;
}

.btn-link:hover {
  color: var(--primary-dark-blue);
  text-decoration: underline;
}
```

### Cards
```css
.card {
  background: var(--primary-white);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow-color);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.card-image {
  width: 100%;
  height: 240px;
  object-fit: cover;
}

.card-content {
  padding: var(--space-6);
}

.card-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.card-description {
  font-size: var(--text-base);
  color: var(--text-secondary);
  line-height: var(--leading-normal);
  margin-bottom: var(--space-4);
}
```

### Hero Section
```css
.hero {
  background: linear-gradient(135deg, var(--primary-dark-blue) 0%, var(--primary-navy) 100%);
  color: var(--text-on-dark);
  padding: var(--space-24) var(--space-8);
  text-align: center;
}

.hero-title {
  font-size: var(--text-5xl);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-6);
  line-height: var(--leading-tight);
}

.hero-subtitle {
  font-size: var(--text-xl);
  font-weight: var(--font-regular);
  margin-bottom: var(--space-8);
  opacity: 0.9;
}
```

---

## Content Sections

### Section Patterns
The website follows these common section patterns:

1. **Hero Section**: Large heading, subtitle, CTA
2. **Three-Column Cards**: Solutions/products display
3. **Feature Sections**: Alternating image-text blocks
4. **Testimonials**: Cards with photos and quotes
5. **Footer**: Multi-column sitemap

### Section Styling
```css
.section {
  padding: var(--space-16) var(--space-8);
}

.section-title {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-8);
  text-align: center;
}

.section-subtitle {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  margin-bottom: var(--space-12);
  text-align: center;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}
```

---

## Footer

### Footer Structure
```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]                                                  │
│                                                          │
│  Contact Us    Solutions    Services    Experience      │
│  • Details     • Products   • Services  • HR mission    │
│  • Locations   • Categories • Training  • Careers       │
│                                                          │
│  About VM Building Solutions    Legal Information       │
│  • Company info                 • Privacy               │
│  • History                      • Terms                 │
│                                                          │
│  © VM Building Solutions - Trademarks                   │
└─────────────────────────────────────────────────────────┘
```

### Footer Styling
```css
.footer {
  background-color: var(--epdm-black);
  color: var(--text-on-dark);
  padding: var(--space-16) var(--space-8) var(--space-8);
}

.footer-section-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--space-4);
}

.footer-link {
  color: var(--text-on-dark);
  opacity: 0.8;
  text-decoration: none;
  transition: opacity 0.3s ease;
}

.footer-link:hover {
  opacity: 1;
  text-decoration: underline;
}
```

---

## Images & Media

### Image Guidelines
- **Format**: JPG for photos, SVG for logos/icons, PNG for transparency
- **Aspect Ratios**:
  - Hero images: 16:9 or 21:9
  - Card images: 4:3 or 16:9
  - Product images: 1:1 or 4:3
- **Quality**: High-resolution architectural photography
- **Style**: Professional, clean, industrial aesthetic
- **Subject Matter**: Buildings, materials, installations

### Image Styling
```css
.image-container {
  overflow: hidden;
  border-radius: 8px;
}

.image-full-width {
  width: 100%;
  height: auto;
  display: block;
}

.image-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Mobile Considerations
- Stack cards vertically on mobile
- Hamburger menu for navigation
- Touch-friendly button sizes (min 44x44px)
- Simplified hero sections
- Reduce padding/spacing on small screens

---

## Animations & Transitions

### Standard Transitions
```css
--transition-fast: 150ms ease;
--transition-base: 300ms ease;
--transition-slow: 500ms ease;
```

### Hover Effects
- Subtle elevation (cards lift 4px)
- Color transitions on buttons and links
- Opacity changes on images (0.9 to 1)

### Loading States
- Skeleton screens for content loading
- Fade-in animations for images
- Smooth scroll behavior

---

## Accessibility

### Color Contrast
- Ensure WCAG AA compliance minimum (4.5:1 for normal text)
- Dark blue on white: Excellent contrast
- White on dark blue: Excellent contrast

### Interactive Elements
- Clear focus states (outline or background change)
- Keyboard navigation support
- Screen reader friendly labels

### Typography
- Minimum 16px for body text
- Maximum line length: 75 characters
- Adequate line spacing (1.5 minimum)

---

## Key Brand Messages

### Tagline
"Best partner for roof and facade professionals"

### Product Lines
1. **VMZINC**: Zinc titanium solutions for roofing and facades
2. **EPDM**: Durable rubber membranes for waterproofing
3. **Nordic Copper**: Premium copper architectural applications

### Brand Values
- Quality and durability
- Sustainability and environmental responsibility
- Professional expertise and training
- Innovation in building materials
- Partnership with professionals

---

## Content Tone & Voice

### Writing Style
- Professional and authoritative
- Clear and technical (B2B focused)
- Solution-oriented
- Emphasis on quality and durability
- European market perspective

### Call-to-Action Examples
- "Read more"
- "Learn more"
- "Discover our solutions"
- "Contact us"
- "View portfolio"
- "Explore training"

---

## Implementation Notes for Claude Code

### HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VM Building Solutions - Landing Page</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="header">
        <!-- Logo and navigation -->
    </header>
    
    <main>
        <section class="hero">
            <!-- Hero content -->
        </section>
        
        <section class="section">
            <!-- Content sections -->
        </section>
    </main>
    
    <footer class="footer">
        <!-- Footer content -->
    </footer>
</body>
</html>
```

### CSS Reset Recommendation
Include a modern CSS reset (like normalize.css or a custom reset) to ensure consistency across browsers.

### Font Loading
```html
<!-- Google Fonts example -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Critical CSS
Consider inlining critical CSS for above-the-fold content to improve initial load performance.

---

## Quick Reference

### Most Used Colors
- Primary: `#1a3a52` (dark blue)
- Background: `#ffffff` (white)
- Text: `#333333` (dark gray)
- Links: `#3a7fa8` (hover blue)
- Borders: `#e0e0e0` (light gray)

### Most Used Fonts
- Headings: Inter Bold (700), 24-48px
- Body: Inter Regular (400), 16px
- Links: Inter Medium (500), 16px

### Most Used Spacing
- Section padding: 4rem (64px)
- Card padding: 1.5rem (24px)
- Element spacing: 1rem (16px)

---

## Additional Resources

### Website Reference
- Main site: https://www.vmbuildingsolutions.com/homepage
- Logo path: `/media/shared-images/logo-vmbso.svg`
- Powered by logo: `/media/images/logo-powered-by.svg`

### Brand Extensions
- VMZINC: Zinc solutions brand
- Nordic Copper: Copper solutions brand
- EPDM: Membrane solutions

---

*Document prepared for Claude Code integration - January 2026*
*Based on analysis of vmbuildingsolutions.com*

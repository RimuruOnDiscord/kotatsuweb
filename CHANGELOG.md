# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Development Notice:** Moving forward, site updates will be released on a periodic, weekly schedule. This shift from irregular, massive updates to a steady weekly cadence allows us to deliver features faster, iterate on community feedback more effectively, and ensure greater overall platform stability.

## [1.4.0] - 2025-05-24
### Added
- **New Release Cadence:** Officially transitioned to a weekly update schedule to ensure consistent platform improvements and better stability.

### Changed
- Completely overhauled the application's UI to feature a premium "Glassmorphism" aesthetic.
- Replaced hard structural borders with seamless inset shadows, subtle linear gradients, and frosted glass backdrop blurs.
- Updated the Search Dropdown UI and Topbar tooltips to utilize the new borderless, frosted-glass styling with snappier animations.
- Redesigned the Anime Home page with new `glass-hero` and `glass-section` layouts, creating a more immersive browsing experience.
- Overhauled the Anime Detail page, converting episode cards, statistic panels, review cards, and streaming links to use the new `glass-card` system.
- Fine-tuned Framer Motion spring physics across buttons, media cards, and dropdowns for highly tactile, premium hover and press interactions.

### Removed
- Removed legacy solid borders from media cards, quick filter dropdowns, and navigation tabs to achieve a cleaner, modern look.

## [1.3.0] - 2025-04-30
### Added
- Changelog modal that reads directly from this file on GitHub
- Animated version sidebar with NEW badge on latest release
- Color-coded category pills (Added, Fixed, Changed, Removed, Security)
- Live preview in subtitle settings panel

### Changed
- Sidebar navigation now highlights active tab with accent-colored indicator
- Theme picker previews now animate width on selection
- Modal spring physics tuned for snappier feel

### Fixed
- Avatar image no longer flickers on first load
- Select dropdown now closes on outside click in all browsers

## [1.2.1] - 2025-03-14
### Fixed
- Fixed an issue where settings would not save on certain browsers
- Minor UI alignment fixes in the navigation bar

## [1.2.0] - 2025-02-20
### Added
- Initial implementation of the settings panel
- Support for custom user avatars

## [1.1.0] - 2025-01-05
### Changed
- Replaced standard scrollbars with custom unified scrollbars across the app
- Optimized image loading for faster perceived performance

## [1.0.0] - 2024-12-01
### Added
- Initial public release

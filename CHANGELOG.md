# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Development Notice:** Moving forward, site updates will be released on a periodic, weekly schedule. This shift from irregular, massive updates to a steady weekly cadence allows us to deliver features faster, iterate on community feedback more effectively, and ensure greater overall platform stability.

## [1.1.0] - 2025-05-02
### Added
- **Anime Subscription System:** Subscribe to any releasing or upcoming anime directly from its detail page. When its status changes (e.g. from "Not Yet Released" to "Releasing"), you'll receive a notification on your next visit.
- **Subscriptions Tab:** New dedicated tab inside the Notification Center to view and manage all your tracked anime, with one-click unsubscribe and direct navigation to each title.
- **New Releases Tab:** Dedicated notification tab for new episode drops and anime announcements, keeping release alerts cleanly separated from general notifications.
- **Clickable Notifications:** Release and episode notifications now navigate you directly to the anime's detail page when clicked.

### Changed
- **Notification Performance:** Replaced all Framer Motion `whileHover` JavaScript-driven animations with hardware-accelerated CSS transitions for significantly smoother hover interactions across the entire Notification Center.
- **Notification Icons:** Release notifications now display clean, color-tinted icons instead of cover art thumbnails for a more consistent, polished look.
- **Detail Page Actions:** The "Watch First" and "Watch Latest" buttons are now hidden when a Resume button is present, reducing clutter and prioritizing the most relevant action.
- **Carousel Seamlessness:** Fixed the Spotlight numbering on cloned carousel slides so the infinite loop transition is perfectly seamless with no visible text flicker.

### Fixed
- **Home Carousel Stability:** Resolved an intermittent issue where the hero banner would render blank after being backgrounded, by adding strict bounds-clamping and a fallback timeout for missed `transitionend` events.

## [1.0.0] - 2025-05-24
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

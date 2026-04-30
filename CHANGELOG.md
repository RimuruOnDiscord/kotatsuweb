# Changelog

All notable changes to this project are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

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
- ESC key handler cleaned up properly on unmount

---

## [1.2.1] - 2025-03-14

### Fixed
- Volume setting not persisting across sessions
- Autoplay toggle state was inverted on first render
- Display name input losing focus on re-render

---

## [1.2.0] - 2025-02-20

### Added
- Streaming source selector in Player settings
- Audio language preference (Subbed / Dubbed)
- Default quality setting with Auto (recommended) option

### Changed
- Settings modal now uses a portal to avoid z-index conflicts
- Backdrop blur increased for better depth separation

### Removed
- Legacy localStorage-based theme persistence (replaced by CSS variable approach)

---

## [1.1.0] - 2025-01-05

### Added
- Subtitle live preview in settings
- Background color picker for subtitles with hex display
- Background opacity control

### Changed
- Section cards now use subtle inset highlight instead of border-only style
- Reduced motion on tab switch for users who prefer reduced motion

### Security
- Avatar URL input now validated client-side before sending to profile update

---

## [1.0.0] - 2024-12-01

### Added
- Initial release
- Settings modal with Profile, Appearance, Player, Streaming, and Subtitles tabs
- Theme picker with accent color presets
- Toggle and Select UI primitives
- Framer Motion animations throughout

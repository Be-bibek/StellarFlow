# UI Components Architecture

The StellarFlow web application relies on a modular UI component architecture to deliver a "high-fidelity, flashy minimalist" aesthetic. These components strictly follow the styling guidelines mandated in `[[ui-deck-spec]]`.

## Core Primitives

### `GooeyNav`
- **Location**: `components/ui/gooey-nav.tsx`
- **Function**: Replaces the standard navigation bar with a liquid, SVG-filtered animated dock. It manages the `activeView` state and orchestrates the transition between the 13 core views.

### `Carousel`
- **Location**: `components/ui/carousel.tsx`
- **Function**: Renders sub-vaults as physical, stacking 3D credit cards. 
- **Responsiveness**: Dynamically measures window width to adjust `baseWidth` (280px on mobile, 360px on desktop) preventing text overflow on narrow screens.

### `SwapWidget`
- **Location**: `components/ui/swap-widget.tsx`
- **Function**: A modular, glassmorphic container offering quick path-payment conversions.

### `LaserFlow`
- **Location**: `components/ui/laser-flow.tsx`
- **Function**: A heavy WebGL/Canvas background effect drawing neon cyan and violet beams. Used to signify hardware secure-lock states or transit activity. 

## Architectural Rules for Flutter Integration
When porting this architecture to Flutter, the Dart widgets MUST map 1:1 with these components. For example, `Carousel` should be rebuilt using a Flutter `PageView.builder` with custom 3D matrix transforms to replicate the exact Next.js CSS properties.

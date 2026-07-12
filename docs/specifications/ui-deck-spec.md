# UI Deck Specification

## Core Visual Language
StellarFlow OS utilizes a **high-fidelity, flashy minimalist layout**. The primary design metaphor is an overlapping stacked card deck, inspired by high-end wallet vault frameworks. This layout maximizes data density while maintaining a premium, uncluttered aesthetic.

## Asset Layout Guidelines
- **Containers**: Use glassy, translucent layers with heavy blur effects (e.g., `backdrop-blur-2xl` in Tailwind) over dynamic mesh gradient backgrounds.
- **Color Palette**: 
  - Primary accents: Neon Cyan (`#00FFFF`) and Deep Violet (`#7C3AED`).
  - Base layers: Deep space blacks and slate grays (`#0F172A`).
- **Typography**: Clean, sans-serif fonts (e.g., Inter, Space Grotesk) with tracking optimizations for numbers and addresses.

## Modular Component Zones
1. **The Vault Deck**: The central visual element where different wallets/assets are represented as physical-looking cards stacked on top of one another.
2. **Hardware Secure-Lock Indicator**: A native indicator zone reflecting the hardware key status (locked/unlocked) using glowing neon borders (Cyan = Unlocked, Violet = Locked/Standby).
3. **QR Scanning Layout**: A full-bleed modal overlay with a targeting reticle and a translucent backdrop, prioritizing the camera feed.

## Cross-Platform Rule
Both the Next.js web application and the Flutter mobile wallet MUST adhere exactly to these layout metrics, ensuring a unified brand and user experience across all devices.

# Evidentia Design System

## Overview
A bespoke, light-theme only component library built for the Evidentia document verification platform. 
Aesthetic: "Instrument Panel" / "Warm Paper" with strong typography and hard offset shadows.

## File Structure
`frontend-react/src/components/ui/`
- **Core Layout**: `Panel.jsx`, `PanelHeader.jsx`, `CornerBrackets.jsx`
- **Data Display**: `StatTile.jsx`, `StatusPill.jsx`, `HashChip.jsx`, `LiveLog.jsx`
- **Verification UI**: `PipelineBars.jsx`, `ScanFrame.jsx`, `HeatmapOverlay.jsx`, `VerifiedSeal.jsx`, `CompareSlider.jsx`
- **Controls**: `Button.jsx`, `Tabs.jsx`, `Input.jsx`, `Select.jsx`, `Switch.jsx`, `Checkbox.jsx`
- **Feedback/Overlay**: `Modal.jsx`, `Drawer.jsx`, `Toast.jsx`, `Tooltip.jsx`, `EmptyState.jsx`, `Skeleton.jsx`

## Tokens
- **Colors**: Ink (`#14130F`), Paper (`#F4F1EA`), Amber (`#F59E0B`).
- **Typography**: `JetBrains Mono` (Labels/Nav), `Instrument Serif` (Display), `Geist/Inter` (Body).
- **Shape**: 4px radius standard.
- **Shadow**: `4px 4px 0 #14130F` on interactive hover.
- **Animation**: strictly transform/opacity. 

## Next Steps for Frontend Engineer
1. Build out the components listed in `src/components/ui` following these design rules.
2. Integrate `framer-motion` for `VerifiedSeal` stamp animations and `PipelineBars` fill animations.
3. Replace existing shadcn/ui generic components with these bespoke instrument-panel components.

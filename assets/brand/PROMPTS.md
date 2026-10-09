# 品牌图形生成提示词

工具：Codex 内置 `image_gen`。以下记录实际采用的图形母版、精修与 Logo 提示词。深色透明精修版本有边缘杂点，未纳入交付，最终深色图为带背景展示版。

## icon

```text
Use case: logo-brand.
Asset type: production mobile application icon, square, for a Chinese fitness and daily health journal named 循形 / FitTrace.
Primary request: create one confident, original, very simple flat graphic app icon. Solid pine green background (#2F7D5B) filling the entire square edge to edge. One warm white (#F7FAF5) geometric symbol centered. The symbol is a distinctive uppercase F whose rounded vertical stem and two broad arms also read as a continuous tracking route; integrate one separate small circular waypoint near the tip of the upper right arm. The F and waypoint must look deliberately designed, with smooth consistent rounded stroke weight, optical alignment, balanced negative space, and a strong silhouette. Keep the silhouette readable at 16 px. The mark occupies roughly 52-56% of the square so it stays inside the Android adaptive icon safe region. Calm, mature, precise fitness record product branding. The route communicates daily tracking, not a medical pulse or an aggressive gym.
Composition: straight-on flat 2D, one icon only, pure solid background, glyph centered both horizontally and vertically, generous equal padding.
Constraints: no text or wordmark, no border, no outer rounded corner mask (square full-bleed canvas), no gradient, no texture, no shadows, no lighting, no mockup, no 3D, no extra objects, no dumbbell, no heart, no leaf, no shoe, no flame, no stock upward bar chart. Do not imitate an existing brand.
```

## iconRefinement

```text
Use case: precise-object-edit. Asset type: final production app icon.
Edit the supplied app icon. Keep the exact F-shaped mark and waypoint, exact positions, proportions, spacing, and square framing unchanged. Change ONLY the surface finish: remove all paper grain, texture, speckles, color variation and lighting. Fill the entire background with one perfectly uniform solid pine green #2F7D5B, and fill the entire F mark and waypoint with one perfectly uniform warm white #F7FAF5. Crisp clean antialiased edges, absolutely flat vector-like 2D graphic. No gradient, no shadow, no bevel, no text, no outer rounded mask. This is a finished small app icon that must be clean at 16px as well as large size.
```

## logo

```text
Use case: logo-brand. Asset type: a production horizontal bilingual brand logo with actual transparent background.
The supplied image is the symbol reference. Reproduce this EXACT same F-shaped symbol and detached round waypoint without changing its silhouette, proportions, or spacing. Render the symbol in solid pine green #2F7D5B with no square backing. Place the symbol on the left, and a polished bilingual wordmark on the right: exact Chinese text "循形" in a calm modern medium-weight Chinese sans-serif typeface, and exact English text "FitTrace" below it in a smaller clean medium-weight sans-serif. Preserve uppercase F and uppercase T in FitTrace, all other letters lowercase. Both lines should align left. Chinese wordmark in charcoal #202923; English in muted green-grey #637067. The Chinese and English occupy a refined compact two-line lockup, with the symbol about equal to the height of the two-line lockup. Balanced spacing, mature mobile fitness journal branding.
Composition: one wide horizontal logo centered within a closely fitted landscape canvas, approximately 3:1 width to height. Do not add a poster, labels, dimensions, alternative versions, slogan, trademark sign, or any other text. No background, no frame, no decorative shapes, no gradients, no texture, no shadows, no 3D. Clean transparent PNG artwork. Text MUST read exactly 循形 and FitTrace.
```

## darkPresentation

```text
Use case: logo-brand. Create a precise clean flat horizontal brand logo on a SOLID dark charcoal background #161D19, fully opaque image, not transparent. Brand name exactly '循形' with English exactly 'FitTrace' in smaller font below, both on right. Use the attached reference for overall layout and exact F symbol geometry: broad softly rounded F with a separate circular waypoint near its upper right arm. Left symbol mint green #67CDA3. Chinese off-white #F3F7F4 in clean modern bold sans serif. English pale grey #B6C0BC in matching bold sans. Tight tasteful spacing, simple compact horizontal lockup. All elements flat filled with smooth immaculate edges. No rough textures, shadows, lighting, gradients, edge outlines, flecks or distressed letters. Background uniform single flat dark color across entire canvas. Fit logo inside horizontal 3:1 canvas with balanced moderate padding. No additional text, decorations, grids, or mockup.
```

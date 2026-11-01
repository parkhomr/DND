# Asset provenance and generation prompts

All illustrations were created for this project with the **built-in OpenAI Imagegen tool**. No paid stock assets or copied game artwork were used. The original PNG outputs were copied into the workspace. WebP derivatives are format/quality compression of those outputs, with no composition changes.

| Asset                            | Source                     | Runtime derivative          |
| -------------------------------- | -------------------------- | --------------------------- |
| The Last Ember tavern            | `public/art/tavern.png`    | `public/art/tavern.webp`    |
| Blackwood forest                 | `public/art/forest.png`    | `public/art/forest.webp`    |
| Six-character 3×2 portrait atlas | `public/art/portraits.png` | `public/art/portraits.webp` |

The final prompt set is preserved below.

## Tavern prompt

Use case: stylized-concept. Asset type: background illustration for an original dark fantasy browser RPG. Create a beautifully painted cinematic medieval tavern interior at night, in landscape 16:9 composition. Called The Last Ember: a sprawling ancient timber and gothic stone tavern with a vast central hearth burning warm amber, tall cold teal moonlit leaded windows on left, heavy oak beams and chandeliers, candle-lit tables, worn timber floor, a black raven near a window, a mysterious hooded female traveler sitting right of center, a stern grey-haired innkeeper behind the bar on far right, a distant rainy medieval city glimpsed through a doorway. Warm amber fire against cold blue-green night. Layered depth, tangible painterly brushwork, sophisticated classic fantasy concept art, rich atmospheric fog, exquisite environmental storytelling, serious realistic proportions. Wide view from near entrance, hearth central-left, inviting open floor lower middle, no close-up characters. Dark edges provide space for overlaid game interface. Exceptionally high-quality finished art. No text, no letters, no logos, no UI, no borders, no watermark. Original setting, no recognizable copyrighted characters.

## Forest prompt

Use case: stylized-concept. Asset type: original browser RPG background, landscape 16:9. An ancient dark fantasy forest at night, winding wet stone path leads toward a ruined gothic fortress just visible in the distance, huge gnarled trees, dripping moss, tiny amber ghost lights and warm lantern hanging from a crooked post, cold teal moonlight and layered fog, weathered ravens and broken stone bell, absolutely beautiful cinematic painterly fantasy environment art, detailed brushwork, contemplative dangerous mood, palette dark pine green, cool blue grey, small warm amber accents. Rich depth, inviting exploration. No UI no lettering no logos no watermark.

## Portrait atlas prompt

Use case: stylized-concept. Asset type: game character portrait sprite atlas. A SINGLE rectangular contact sheet with exactly SIX head-and-shoulders portraits laid out in a precise 3-column 2-row grid of equally sized panels, each portrait centered within its panel, no gaps or frames. Original dark gothic fantasy, exquisite realistically painted oil portrait art, consistent muted green-black backgrounds and warm amber rim light. Top left: handsome weathered grey-haired male human warrior with short beard and leather armor. Top middle: mysterious pale young woman with black hair in deep dark green hood and black leather rogue armor. Top right: handsome silver-haired male elven scholar, pointed ears, angular face, teal embroidered robe. Bottom left: red-haired female fire mage with freckles and glowing amber eyes in dark burgundy robe. Bottom middle: older dark-skinned male merchant with elaborate coat and one gold earring. Bottom right: calm female priest with white hair, linen hood, silver leaf pendant. Each face unique, lifelike emotional eyes, premium CRPG portraits. No text, numbers, letters, grid lines or watermark.

## Code-native art and fonts

`SceneArt.tsx`, `WorldMap.tsx`, the sigil and tile treatments are original programmatic SVG/CSS. Particle effects and synthesized sound are procedural; no external sound files are required.

Cormorant Garamond and Manrope are served locally from `public/fonts`. Source: Google Fonts. Their SIL Open Font License texts are included alongside the font files. Lucide icons use the ISC license supplied with `lucide-react`.

No image generation occurs at runtime. No runtime asset depends on a path outside this repository.

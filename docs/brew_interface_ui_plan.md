# Brew Interface UI Assets And Integration Plan

Generated asset folder:

`assets/resources/image/ui/brew_interface`

## Generated Assets

- `panel_brew_lower_bg.png`: main lower panel background for 今日茶单 + 制茶台.
- `card_today_recipe.png`: 今日茶单 recipe card background.
- `button_tea_base.png`: large tea-base button background.
- `chip_additive.png`: compact additive chip button background.
- `button_start_brew.png`: primary 开始冲泡 button background.
- `badge_status_jade.png`: small status badge for 体力 / 队列 / 速度.
- `tray_product_station.png`: 成品台 tray background.
- `icon_tea_green.png`: green tea cup icon.
- `icon_tea_black.png`: black tea cup icon.
- `icon_tea_oolong.png`: oolong tea cup icon.
- `icon_add_none.png`: no-additive icon.
- `icon_add_sugar.png`: sugar icon.
- `icon_add_flower.png`: flower icon.
- `icon_add_milk.png`: milk icon.
- `icon_energy.png`: stamina icon.
- `icon_queue.png`: order queue icon.

## Implemented Changes

- `TeaHouseControlPanel` now uses the generated carved wood panel background.
- 今日茶单 slots now use generated recipe card sprites and tea-base icons.
- 制茶台 now has status badges, tea-base icons, additive icons, a skinned brew CTA, and a product tray.
- Existing utility buttons are preserved as a compact bottom row to avoid blocking brewing controls.

## Next Polish Pass

- Bind the status badge labels to live energy, queue count, and workstation speed values.
- After Cocos imports the new PNGs, verify there are no `brew_interface` resource-load warnings in preview.
- If the generated card/button edges look stretched, convert the relevant sprites to sliced mode in the editor.

# Ready Set Roll for 5e - FoundryVTT Module
**Ready Set Roll** is a Foundry VTT module that accelerates the built in rolling system of the [Foundry DnD5e system](https://github.com/foundryvtt/dnd5e). It allows for quick rolls with advantage, disadadvantage, and other modifiers for skills, items, ability checks, and saving throws. This module is a complete rewrite and modernisation of [RedReign](https://github.com/RedReign)'s [Better Rolls for 5e](https://github.com/RedReign/FoundryVTT-BetterRolls5e) module, which is no longer supported, and no longer functional as of more recent versions of FoundryVTT. 

If you are feeling generous, and would like to support my work, you can do so through this [Paypal](https://www.paypal.com/paypalme/MangoFVTT) link, or through the sponsorship options in the sidebar. Thank you!

## Installation

### Method 1
1. Start up Foundry and click "Install Module" in the "Add-on Modules" tab.
2. Search for "Ready Set Roll" in the pop up window.
3. Click "Install" and the module should download and appear in your modules list.
4. Enjoy!

### Method 2
1. Start up Foundry and click "Install Module" in the "Add-on Modules" tab.
2. Paste one of the following into the "Manifest URL" field:
    - *Latest Release:* `https://raw.githubusercontent.com/MangoFVTT/fvtt-ready-set-roll-5e/master/module.json`
    - *Previous Releases:* A link to the `module.json` file from any of the [previous releases](https://github.com/MangoFVTT/fvtt-ready-set-roll-5e/releases).
3. Click "Install" and the module should download and appear in your modules list.
4. Enjoy!

## Compatibility
Ready Set Roll is not compatible with other modules which modify DnD5e rolls. While it is possible that such modules may also still work, it is likely to cause issues, and is not recommended.

Ready Set Roll requires [libWrapper](https://foundryvtt.com/packages/lib-wrapper/) as a dependency to avoid conflicts with other modules. This dependency will be automatically resolved by Foundry when installed. It is recommended to have the latest version of libWrapper installed at all times.

## Implemented Features

### Quick Rolls
- Rolls for skills, abilities, and items are outputted automatically to chat instead of relying on the default roll dialog system. These quick rolls can be enabled or disabled individually for each category of rolls, or bypassed in favour of the default behaviour by holding `alt` when clicking the roll.
- Using modifier keys such as `shift` and `ctrl` allows for the roll to immediately output with advantage or disadvantage, and will automatically add in any required additional rolls (e.g. for Elven Accuracy). Rolls with advantage or disadvantage highlight the correct roll, indicating which roll is used.
- Items will automatically output damage, calculate critical damage (taking into account system settings for powerful criticals or critical numerical modifiers), place area templates, print Save DC buttons, and a variety of other options that can all be configured independently for each item.

![quickrolls](https://user-images.githubusercontent.com/110994627/188636272-a557cd66-082d-46a3-a4e9-bf44e9c03535.png)

### Roll Configuration & Alt Rolls
- Rolls can be configured via a "Quick Rolls" tab while editing an item. This allows you to select what parts of the item are actually outputted to the quick roll.
- Item configuration extends system support for thrown items, consumables, ammunition, and items with otherwise limited quantities.
- If enabled, items can also output an alternate roll when holding `alt`. This alternate roll can be configured independently of the default configuration. Enabling alternate rolls for items disables the ability to use the default dialog rolling for items.

![rollconfig](https://user-images.githubusercontent.com/110994627/188637202-f0e4ba7b-7790-4c97-9be6-bc64f4be7015.png)

### Damage Context
- Damage fields can be given additional context strings to convey extra information about that particular damage group. This context will be then shown on the chat card, as either part of the overall damage description or a replacement to default damage titles/type strings.

## Planned Features
- Individual damage overlay buttons to apply the damage of a single field. In the meantime, you can still apply the total damage of a roll to a token like you would in the core system.
- Retroactive roll editing, allowing for rolls to be updated with Advantage/Disadvantage/Critical Damage.
- Macro support for more flexible quick rolling.
- Compatibility with other modules.

## Known Issues
- "Other" formula does not appear in roll configuration tab.
- "Uses" does not appear in the consume row for Features until another consumable is added.

## Acknowledgements
- Atropos and the Foundry development team for making a truly fantastic VTT.
- RedReign for creating the original Better Rolls for 5e module, without which this module would not exist.
- All the wonderful folks on the Foundry VTT discord for their tireless community efforts.

## License
The source code is licensed under GPL-3.0.

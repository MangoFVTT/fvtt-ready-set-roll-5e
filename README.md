# Ready Set Roll for 5e - FoundryVTT Module
![Latest Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FMangoFVTT%2Ffvtt-ready-set-roll-5e%2Fmaster%2Fmodule.json&label=Latest%20Release&prefix=v&query=$.version&colorB=blue&style=for-the-badge)
![Foundry Versions](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dfor-the-badge%26url%3Dhttps%3A%2F%2Fraw.githubusercontent.com%2FMangoFVTT%2Ffvtt-ready-set-roll-5e%2Fmaster%2Fmodule.json&color=ff601e&label=Compatible%20Foundry%20Versions)
![GitHub all releases](https://img.shields.io/github/downloads/MangoFVTT/fvtt-ready-set-roll-5e/total?style=for-the-badge&label=Module%20Downloads)

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
**IMPORTANT:** Ready Set Roll is not compatible with other modules which modify DnD5e rolls (for example, [Midi-QOL](https://gitlab.com/tposney/midi-qol) or [MRE](https://github.com/ElfFriend-DnD/FVTT-Minimal-Rolling-Enhancements-DND5E)). While it is possible that such modules may also still work, using their roll automation features alongside this module is likely to cause issues, and is not recommended.

Ready Set Roll requires [libWrapper](https://foundryvtt.com/packages/lib-wrapper/) as a dependency to avoid conflicts with other modules. This dependency will be automatically resolved by Foundry when installed. It is recommended to have the latest version of libWrapper installed at all times.

### Verified Modules
The following modules have been verified as compatible from the specified module release onward. Note that updates to Foundry VTT or the module in question may cause incompatibilities that need to be re-tested. Furthermore, each verified module is tested with Ready Set Roll in isolation. Combining modules is likely to still work, however may cause issues. Always proceed with caution (keep backups) when installing and using multiple modules.
- [Dice So Nice](https://gitlab.com/riccisi/foundryvtt-dice-so-nice) <sup>(1.2.0+)</sup>
- [Tidy5e Sheet](https://github.com/sdenec/tidy5e-sheet) <sup>(1.2.0+)</sup>
- [Dynamic Active Effects](https://gitlab.com/tposney/dae) <sup>(1.3.1+)</sup>
- [Build-a-Bonus](https://github.com/krbz999/babonus) <sup>(1.3.2+)</sup>

## Implemented Features

### Quick Rolls
- Rolls for skills, abilities, and items are outputted automatically to chat instead of relying on the default roll dialog system. These quick rolls can be enabled or disabled individually for each category of rolls, or bypassed in favour of the default behaviour by holding `alt` when clicking the roll.
- Items will automatically output damage, calculate critical damage (taking into account system settings for powerful criticals or critical numerical modifiers), place area templates, print Save DC buttons, and a variety of other options that can all be configured independently for each item.
- Using modifier keys such as `shift` and `ctrl` allows for the roll to immediately output with advantage or disadvantage, and will automatically add in any required additional rolls (e.g. for Elven Accuracy). Rolls with advantage or disadvantage highlight the correct roll, indicating which roll is used.

![quickrolls](https://user-images.githubusercontent.com/110994627/188636272-a557cd66-082d-46a3-a4e9-bf44e9c03535.png)

- If the correct setting is enabled, quick rolls can also always display the maximum amount of correct dice for a roll (2 normally, 3 for an Elven Accuracy roll) even when the roll does not have advantage or disadvantage. This can be interchangeably combined with using modifier keys to grant a roll advantage or disadvantage, in which case the correct roll out of those displayed will be highlighted as normal.

![alwayson](https://user-images.githubusercontent.com/110994627/189175659-22c15f1f-f597-430e-bc22-dab3606c1b0f.png)

### Roll Configuration & Alt Rolls
- Rolls can be configured via a "Quick Rolls" tab while editing an item. This allows you to select what parts of the item are actually outputted to the quick roll.
- Item configuration extends system support for thrown items, consumables, ammunition, and items with otherwise limited quantities.
- If enabled, items can also output an alternate roll when holding `alt`. This alternate roll can be configured independently of the default configuration. Enabling alternate rolls for items disables the ability to use the default dialog rolling for items.

![rollconfig](https://user-images.githubusercontent.com/110994627/188637202-f0e4ba7b-7790-4c97-9be6-bc64f4be7015.png)

### Retroactive Roll Editing
- If enabled via the module settings, quick rolls can be edited post creation, allowing for retroactively rolling advantage, disadvantage, or critical damage for a roll after it has already been created.
- Changes to the roll will automatically live edit the quick roll's chat card, displaying the new data alongside the already existing roll.

![retroactiveoverlay](https://user-images.githubusercontent.com/110994627/189863316-90a483e8-b35b-4bc5-905a-ca7d0e2ea80c.gif)

### Apply Individual Damage
- If enabled via the module settings, each damage field in a quick roll chat card can apply damage or healing to selected tokens individually via overlay buttons. This extends core system behaviour (applying damage via context menus) to allow for the application of each damage field individually instead of as a single whole.
- Damage fields can be applied in a specific manner (damage or healing) regardless of the actual damage type. This is intended to allow Players or GMs to manually decide what to do with the damage field in the event of edge cases (such as a specific damage type healing instead of doing damage for a particular creature).
- Applying critical damage to a token will display a prompt allowing for critical damage to be ignored if desired. This can be disabled via a setting to always apply critical damage.

![damageoverlay](https://user-images.githubusercontent.com/110994627/189862751-41c7e9b3-33a1-49bf-a55a-32f6681954d3.gif)

### Damage Context
- Damage fields can be given additional context strings to convey extra information about that particular damage group. This context will be then shown on the chat card, as either part of the overall damage description or a replacement to default damage titles/type strings.
- Damage context can be configured via the module settings to be placed at various positions of the chat card, and even replace default damage title and type labels.

![damagecontext](https://user-images.githubusercontent.com/110994627/188952930-f8be9901-a45e-43dd-97b4-d707062bc1ad.png)

## Planned Features
- Ability to manually roll damage via a chat card button for quick rolls ([Issue #33](https://github.com/MangoFVTT/fvtt-ready-set-roll-5e/issues/33))
- Sheet roll buttons ([Issue #34](https://github.com/MangoFVTT/fvtt-ready-set-roll-5e/issues/34))
- Compatibility with other modules.
- Macro support for more flexible quick rolling.

## Known Issues
- [See [BUG] Issues list](https://github.com/MangoFVTT/fvtt-ready-set-roll-5e/issues?q=label%3Abug+)

## Acknowledgements
- Atropos and the Foundry development team for making a truly fantastic VTT.
- RedReign for creating the original Better Rolls for 5e module, without which this module would not exist.
- All the wonderful folks on the Foundry VTT discord for their tireless community efforts.

## License
The source code is licensed under GPL-3.0.

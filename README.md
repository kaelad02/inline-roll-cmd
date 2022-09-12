# Inline Roll Commands

Sometimes a feature, weapon, or spell requires more than the one action the system lets you fill out. In some instances, like skills checks, it does not even have that option. Using a similar syntax to deferred inline rolls, you can use this module to add buttons to run certain commands.

Say a feature requires a skill check. Currently, the dnd5e system does not support that action type so you have to write it in the description and the player has to trigger it manually. Now you can put `[[/rollSkill slt]]` into the feature's description and this module will turn that into a button that will roll an Slight of Hand check when clicked.

### Before

![Fast Hands before screenshot](docs/fast-hands-before.png?raw=true)

### After

![Fast Hands after screenshot](docs/fast-hands-after.png?raw=true)

## Usage

If you are familiar with the deferred inline rolls that Foundry supports, then this should look familiar. You write a command inside square brackets that will trigger that command when clicked.

General Syntax: `[[/<roll-mode><command> <command arguments>]]`

### Commands

Currently, only the Skill command is supported but there are plans to add other kind of rolls (e.g. ability check and saving throw).

#### Skill

This command will trigger a skill check for the currently-selected tokens. The command requires the skill ID (the short, 3-letter code) for the skill you want to roll. You can find the skill IDs by typing `CONFIG.DND5E.skills` into the browser's console.

**Example:** `[[/rollSkill ath]]` will produce a button to `roll` a `Skill` with the ID `ath` (short for Athletics).

### Roll Modes

In additon to the regular `/roll` that uses the current roll mode at the bottom of the chat log, you can explicitly make the button perform other roll modes using their syntax. Useful if you want to prompt players to make a blind roll so only the GM sees the result by using `/blindroll`, `/broll`, or `/br`. More information on roll modes can be found on the [Basic Dice](https://foundryvtt.com/article/dice/) Foundry KB article.

**Example:** `[[/gmrSkill ath]]` for a GM Roll or `[[/srSkill ath]]` for a Self Roll

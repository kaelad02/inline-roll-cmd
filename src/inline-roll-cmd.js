import { debug, MODULE_NAME } from "./util.js";

/**
 * Register with Developer Mode modle for debug logging.
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => registerPackageDebugFlag(MODULE_NAME));

/**
 * Register the text enrichers to create the deferred inline roll buttons.
 */
Hooks.once("init", () => {
  // example: [[/rollSkill ath]]
  CONFIG.TextEditor.enrichers.push({
    pattern:
      /\[\[\/(r|roll|pr|publicroll|gmr|gmroll|br|broll|blindroll|sr|selfroll)Skill (\w+)\]\](?:{([^}]+)})?/gi,
    enricher: createSkill,
  });

  // example: [[/rollAbility str]]
  CONFIG.TextEditor.enrichers.push({
    pattern:
      /\[\[\/(r|roll|pr|publicroll|gmr|gmroll|br|broll|blindroll|sr|selfroll)Ability (\w+)\]\](?:{([^}]+)})?/gi,
    enricher: createAbility,
  });

  // example: [[/rollSave dex]]
  CONFIG.TextEditor.enrichers.push({
    pattern:
      /\[\[\/(r|roll|pr|publicroll|gmr|gmroll|br|broll|blindroll|sr|selfroll)Save (\w+)\]\](?:{([^}]+)})?/gi,
    enricher: createSave,
  });

  // example: [[/rollItem dex]]
  CONFIG.TextEditor.enrichers.push({
    pattern: /\[\[\/rollItem ([^\]]+)\]\](?:{([^}]+)})?/gi,
    enricher: createItem,
  });

  // activate listeners
  const body = $("body");
  body.on("click", "a.inline-roll-cmd", onClick);
});

/**
 * The rollSkill text enricher that creates a deferred inline roll button.
 * @param {RegExpMatchArray} match the pattern match for this enricher
 * @param {EnrichmentOptions} options the options passed to the enrich function
 * @returns {Promise<HTMLElement>} the deferred inline roll button
 */
function createSkill(match, options) {
  debug("createSkill, match:", match);

  const mode = getRollMode(match[1]);
  const skillId = match[2];
  const flavor = match[3];
  const skill = CONFIG.DND5E.skills[skillId]?.label ?? skillId;
  const title = game.i18n.format("DND5E.SkillPromptTitle", { skill });
  debug("mode", mode, "skillId", skillId);

  return createButton(mode, "skill", { skillId }, flavor, title);
}

function createAbility(match, options) {
  debug("createAbility, match:", match);

  const mode = getRollMode(match[1]);
  const abilityId = match[2];
  const flavor = match[3];
  const ability = CONFIG.DND5E.abilities[abilityId] ?? "";
  const title = game.i18n.format("DND5E.AbilityPromptTitle", { ability });
  debug("mode", mode, "abilityId", abilityId);

  return createButton(mode, "abilityCheck", { abilityId }, flavor, title);
}

function createSave(match, options) {
  debug("createSave, match:", match);

  const mode = getRollMode(match[1]);
  const abilityId = match[2];
  const flavor = match[3];
  const ability = CONFIG.DND5E.abilities[abilityId] ?? "";
  const title = game.i18n.format("DND5E.SavePromptTitle", { ability });
  debug("mode", mode, "abilityId", abilityId);

  return createButton(mode, "save", { abilityId }, flavor, title);
}

function createItem(match, options) {
  debug("createItem, match:", match);
  debug("createItem, options:", options);

  const itemName = match[1];
  const flavor = match[2];
  debug("itemName", itemName);

  let img;
  if (options?.relativeTo?.actor) {
    // find the image from the relativeTo option
    const actor = options.relativeTo.actor;
    const item = actor.items.getName(itemName);
    if (item) img = item.img;
  } else if (game.user.character) {
    // find the image from the assigned character
    const actor = game.user.character;
    const item = actor.items.getName(itemName);
    if (item) img = item.img;
  }

  debug("img", img);
  return img
    ? createItemButton(itemName, flavor, img)
    : createButton("roll", "item", { itemName }, flavor, itemName);
}

/**
 * Normalize the roll mode found by the pattern.
 * @param {String} mode the mode found by the pattern
 * @returns the corresponding value from `CONST.DICE_ROLL_MODES`
 */
function getRollMode(mode) {
  switch (mode) {
    case "r":
    case "roll":
      return "roll";
    case "pr":
    case "publicroll":
      return "publicroll";
    case "gmr":
    case "gmroll":
      return "gmroll";
    case "br":
    case "broll":
    case "blindroll":
      return "blindroll";
    case "sr":
    case "selfroll":
      return "selfroll";
  }
}

function createButton(mode, func, commandArgs, flavor, title) {
  const a = document.createElement("a");
  // add classes
  a.classList.add("inline-roll-cmd");
  a.classList.add(mode);
  // add dataset
  a.dataset.mode = mode;
  a.dataset.func = func;
  a.dataset.flavor = flavor ?? "";
  for (const [k, v] of Object.entries(commandArgs)) {
    a.dataset[k] = v;
  }
  // the text inside
  a.innerHTML = `<i class="fas fa-dice-d20"></i>${flavor ?? title}`;
  return a;
}

function createItemButton(itemName, flavor, img) {
  const a = document.createElement("a");
  // add classes
  a.classList.add("inline-roll-cmd");
  a.classList.add("roll");
  // add dataset
  a.dataset.mode = "roll";
  a.dataset.func = "item";
  a.dataset.itemName = itemName;
  //a.dataset.flavor = flavor ?? "";
  // the text inside
  //a.innerHTML = `<div class="item-image" style="background-image: url('${img}')"></div> ${flavor ?? itemName}`;
  a.innerHTML = `<img class="item-image" src="${img}"></img>${flavor ?? itemName}`;
  return a;
}

/**
 * Listener for the deferred inline roll buttons.
 * @param {Event} event the browser event that triggered this listener
 */
async function onClick(event) {
  event.preventDefault();
  const a = event.currentTarget;

  // Get the tokens to roll with (like the Saving Throw button)
  const tokens = dnd5e.documents.Item5e._getChatCardTargets();
  // get the rollMode, leave undefined for roll so the chat log setting is used
  const rollMode = a.dataset.mode === "roll" ? undefined : a.dataset.mode;

  const flavor = a.dataset.flavor;

  switch (a.dataset.func) {
    case "skill":
      for (const token of tokens) {
        const speaker = ChatMessage.getSpeaker({ scene: canvas.scene, token: token.document });
        await token.actor.rollSkill(a.dataset.skillId, { event, flavor, rollMode, speaker });
      }
      break;
    case "abilityCheck":
      for (const token of tokens) {
        const speaker = ChatMessage.getSpeaker({ scene: canvas.scene, token: token.document });
        await token.actor.rollAbilityTest(a.dataset.abilityId, {
          event,
          flavor,
          rollMode,
          speaker,
        });
      }
      break;
    case "save":
      for (const token of tokens) {
        const speaker = ChatMessage.getSpeaker({ scene: canvas.scene, token: token.document });
        await token.actor.rollAbilitySave(a.dataset.abilityId, {
          event,
          flavor,
          rollMode,
          speaker,
        });
      }
      break;
    case "item":
      dnd5e.documents.macro.rollItem(a.dataset.itemName);
      break;
  }
}

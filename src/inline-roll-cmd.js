import { debug, MODULE_NAME } from "./util.js";

/**
 * Register with Developer Mode modle for debug logging.
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => registerPackageDebugFlag(MODULE_NAME));

const skillPattern =
  /\[\[\/(r|roll|pr|publicroll|gmr|gmroll|br|broll|blindroll|sr|selfroll)Skill (\w+)\]\](?:{([^}]+)})?/gi;
const abilityPattern =
  /\[\[\/(r|roll|pr|publicroll|gmr|gmroll|br|broll|blindroll|sr|selfroll)Ability (\w+)\]\](?:{([^}]+)})?/gi;
const savePattern =
  /\[\[\/(r|roll|pr|publicroll|gmr|gmroll|br|broll|blindroll|sr|selfroll)Save (\w+)\]\](?:{([^}]+)})?/gi;
const itemPattern = /\[\[\/rollItem ([^\]]+)\]\](?:{([^}]+)})?/gi;
/**
 * Register the text enrichers to create the deferred inline roll buttons.
 */
Hooks.once("init", () => {
  // example: [[/rollSkill ath]]
  CONFIG.TextEditor.enrichers.push({
    pattern: skillPattern,
    enricher: createSkill,
  });

  // example: [[/rollAbility str]]
  CONFIG.TextEditor.enrichers.push({
    pattern: abilityPattern,
    enricher: createAbility,
  });

  // example: [[/rollSave dex]]
  CONFIG.TextEditor.enrichers.push({
    pattern: savePattern,
    enricher: createSave,
  });

  // example: [[/rollItem Dagger]]
  CONFIG.TextEditor.enrichers.push({
    pattern: itemPattern,
    enricher: createItem,
  });

  // activate listeners
  const body = $("body");
  body.on("click", "a.inline-roll-cmd", onClick);

  // register setting
  game.settings.registerMenu("inline-roll-cmd", "migrateMenu", {
    name: "IRC.migrateMenuName",
    label: "IRC.migrateMenuLabel",
    icon: "fas fa-refresh",
    type: InlineMigrationApplication,
    restricted: true,
  });
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
  debug("createItem, (match, options):", match, options);

  const itemName = match[1];
  const flavor = match[2];

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

  return img ? createItemButton(itemName, flavor, img) : createButton("roll", "item", { itemName }, flavor, itemName);
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
  // the text inside
  a.innerHTML = `<i class="item-image" style="background-image: url('${img}')""></i>${flavor ?? itemName}`;
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

class InlineMigration {
  async migrateWorld() {
    ui.notifications.info(game.i18n.localize("IRC.migrateWorldStart"), { permanent: true });

    // Migrate actors
    const actorUpdates = await this._migrateActors(game.actors);
    Actor.updateDocuments(actorUpdates);

    // Migrate items
    const itemUpdates = this._migrateItems(game.items);
    Item.updateDocuments(itemUpdates);

    // Migrate unlinked actors on scenes
    await this._migrateScenes(game.scenes);

    ui.notifications.info(game.i18n.localize("IRC.migrateWorldEnd"), { permanent: true });
  }

  async _migrateScenes(scenes) {
    for (const scene of scenes) {
      for (const token of scene.tokens) {
        if (token.actorLink || !token.actor) continue;

        const updateData = await this.migrateActorData(token.actor);
        // if it has item updates, do them now
        if (!foundry.utils.isEmpty(updateData.items)) {
          await token.actor.updateEmbeddedDocuments("Item", updateData.items);
          delete updateData.items;
        }
        // if there are updates to the actor, do them now
        if (!foundry.utils.isEmpty(updateData)) await token.actor.update(updateData);
      }
    }
  }

  _migrateItems(items) {
    const itemUpdates = [];
    for (const item of items) {
      const updateData = this.migrateItemData(item);
      // if there are updates, batch them
      if (!foundry.utils.isEmpty(updateData)) {
        updateData._id = item.id;
        itemUpdates.push(updateData);
      }
    }
    return itemUpdates;
  }

  async _migrateActors(actors) {
    const actorUpdates = [];
    for (const actor of actors) {
      const updateData = await this.migrateActorData(actor);
      // if it has item updates, do them now
      if (!foundry.utils.isEmpty(updateData.items)) {
        debug("About to update an actor's items", actor.name, updateData.items);
        await actor.updateEmbeddedDocuments("Item", updateData.items);
        delete updateData.items;
      }
      // if there are updates to the actor, batch them
      if (!foundry.utils.isEmpty(updateData)) {
        updateData._id = actor.id;
        actorUpdates.push(updateData);
      }
    }
    return actorUpdates;
  }

  async migrateCompendium(pack) {
    if (pack.locked || !["Actor", "Item", "Scene"].includes(pack.documentName)) return;
    ui.notifications.info(game.i18n.format("IRC.migrateCompendiumStart", { pack: pack.title }), { permanent: true });

    for (const ids of this.idChunks(pack)) {
      const updates = [];

      switch (pack.documentName) {
        case "Actor":
          const actors = await pack.getDocuments({ _id__in: ids });
          const actorUpdates = await this._migrateActors(actors);
          Actor.updateDocuments(actorUpdates, { pack: pack.collection });
          break;
        case "Item":
          const items = await pack.getDocuments({ _id__in: ids });
          const itemUpdates = this._migrateItems(items);
          Item.updateDocuments(itemUpdates, { pack: pack.collection });
          break;
        case "Scene":
          const scenes = await pack.getDocuments({ _id__in: ids });
          await this._migrateScenes(scenes);
          break;
      }
    }

    ui.notifications.info(game.i18n.format("IRC.migrateCompendiumEnd", { pack: pack.title }), { permanent: true });
  }

  async migrateActorData(actor) {
    const updateData = {};

    // Convert the different description and biography fields
    if (actor.type === "group") {
      const full = this.toSystemEnrichers(actor.system.description.full || "");
      if (full) updateData["system.description.full"] = full;
      const summary = this.toSystemEnrichers(actor.system.description.summary || "");
      if (summary) updateData["system.description.summary"] = summary;
    } else {
      const value = this.toSystemEnrichers(actor.system.details.biography.value || "");
      if (value) updateData["system.details.biography.value"] = value;
      const pub = this.toSystemEnrichers(actor.system.details.biography.public || "");
      if (pub) updateData["system.details.biography.public"] = pub;
    }

    // Convert items
    const itemUpdates = actor.items.reduce((updates, item) => {
      const itemUpdate = this.migrateItemData(item);
      if (!foundry.utils.isEmpty(itemUpdate)) {
        itemUpdate._id = item.id;
        updates.push(itemUpdate);
      }
      return updates;
    }, []);
    if (!foundry.utils.isEmpty(updateData)) debug("migrateActorData item updates:", itemUpdates);
    updateData.items = itemUpdates;

    return updateData;
  }

  *idChunks(pack) {
    const ids = pack.index.map((i) => i._id);
    while (ids.length) {
      yield ids.splice(0, 100);
    }
  }

  migrateItemData(item) {
    const updateData = {};

    // Convert the description fields
    const desc = this.toSystemEnrichers(item.system.description.value || "");
    if (desc) updateData["system.description.value"] = desc;
    const chat = this.toSystemEnrichers(item.system.description.chat || "");
    if (chat) updateData["system.description.chat"] = chat;

    // Not each item type has this (e.g. feature)
    if (item.system.unidentified?.description) {
      const unident = this.toSystemEnrichers(item.system.unidentified.description);
      if (unident) updateData["system.unidentified.description"] = unident;
    }

    if (!foundry.utils.isEmpty(updateData)) debug("migrateItemData updates:", updateData);
    return updateData;
  }

  toSystemEnrichers(text) {
    let replaced = false;
    const replacers = [
      {
        pattern: skillPattern,
        replacement: (match, _, skillId, flavor) => {
          replaced = true;
          return flavor ? `[[/skill ${skillId}]]{${flavor}}` : `[[/skill ${skillId}]]`;
        },
      },
      {
        pattern: abilityPattern,
        replacement: (match, _, abilityId, flavor) => {
          replaced = true;
          return flavor ? `[[/check ${abilityId}]]{${flavor}}` : `[[/check ${abilityId}]]`;
        },
      },
      {
        pattern: savePattern,
        replacement: (match, _, abilityId, flavor) => {
          replaced = true;
          return flavor ? `[[/save ${abilityId}]]{${flavor}}` : `[[/save ${abilityId}]]`;
        },
      },
      {
        pattern: itemPattern,
        replacement: (match, itemName, flavor) => {
          replaced = true;
          return flavor ? `[[/item ${itemName}]]{${flavor}}` : `[[/item ${itemName}]]`;
        },
      },
    ];

    const newText = replacers.reduce((t, { pattern, replacement }) => t.replaceAll(pattern, replacement), text);
    return replaced ? newText : undefined;
  }
}
// expose this globally
globalThis.inlineMigration = new InlineMigration();

class InlineMigrationApplication extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "IRC.migrateTitle",
      template: "modules/inline-roll-cmd/templates/migration.hbs",
      width: 500,
    });
  }

  async getData(options) {
    return {
      packs: game.packs.contents.filter(
        (pack) => !pack.locked && ["Actor", "Item", "Scene"].includes(pack.documentName)
      ),
    };
  }

  async _updateObject(event, formData) {
    const button = event.submitter;
    const action = button.dataset.action;
    if (action === "migrate-world") {
      return inlineMigration.migrateWorld();
    } else if (action === "migrate-pack") {
      const packId = formData.pack;
      const pack = game.packs.get(packId);
      return inlineMigration.migrateCompendium(pack);
    }
  }
}

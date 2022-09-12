import { debug, MODULE_NAME } from "./util.js";

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) =>
  registerPackageDebugFlag(MODULE_NAME)
);

Hooks.once("init", () => {
  // example: [[/rollSkill ath]]
  CONFIG.TextEditor.enrichers.push({
    pattern:
      /\[\[\/(r|roll|pr|publicroll|gmr|gmroll|br|broll|blindroll|sr|selfroll)Skill (\w+)\]\]/gi,
    enricher: createSkill,
  });

  // activate listeners
  const body = $("body");
  body.on("click", "a.inline-actor-roll", onClick);
});

function createSkill(match, options) {
  debug("createSkill, match:", match);

  const mode = getRollMode(match[1]);
  const skillId = match[2];
  const skill = CONFIG.DND5E.skills[skillId]?.label ?? skillId;
  const title = game.i18n.format("DND5E.SkillPromptTitle", { skill });
  debug("mode", mode, "skillId", skillId);

  const a = document.createElement("a");
  a.classList.add("inline-actor-roll");
  a.classList.add(mode);
  a.dataset.mode = mode;
  a.dataset.func = "skill";
  a.dataset.skillId = skillId;
  a.innerHTML = `<i class="fas fa-dice-d20"></i>${title}`;
  return a;
}

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

async function onClick(event) {
  event.preventDefault();
  const a = event.currentTarget;

  // Get the tokens to roll with (like the Saving Throw button)
  const tokens = dnd5e.documents.Item5e._getChatCardTargets();
  // get the rollMode, leave undefined for roll so the chat log setting is used
  const rollMode = a.dataset.mode === "roll" ? undefined : a.dataset.mode;

  switch (a.dataset.func) {
    case "skill":
      for (const token of tokens) {
        const speaker = ChatMessage.getSpeaker({
          scene: canvas.scene,
          token: token.document,
        });
        await token.actor.rollSkill(a.dataset.skillId, {
          event,
          rollMode,
          speaker,
        });
      }
      break;
  }
}

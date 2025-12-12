
//register settings
Hooks.once("init", () => {
  game.settings.register("combat-narration", "suppressDebug", {
    name: "Suppress Debug Output",
    hint: "If enabled, this module will stop printing debug logs to the console.",
    scope: "client",          // each user can choose independently
    config: true,             // show in module settings UI
    type: Boolean,
    default: true,
    onChange: value => { // Optional: Runs when value changes
      console.log(`My setting changed to: ${value}`);
    },
    requiresReload: true // Optional: If true, requires a reload to take effect
  });
});


//helpers
function narrateLog(...args) {
  const suppress = game.settings.get("combat-narration", "suppressDebug");
  if (!suppress) console.log(...args);
}

function narrateWarn(...args) {
  const suppress = game.settings.get("combat-narration", "suppressDebug");
  if (!suppress) console.warn(...args);
}


Hooks.on("midi-qol.RollComplete", async (workflow) => {
    narrateLog("🗡️ Combat Narration Hook Triggered");

    const item = workflow.item;
    const actor = item?.actor;
    const hitTargets = [...workflow.hitTargets];
    const damageDetails = workflow.damageDetail;

  /*
  // PRINT EVERYTHING
  narrateLog("hitTargets:", workflow.hitTargets ? [...workflow.hitTargets] : []);
  narrateLog("targets:", workflow.targets ? [...workflow.targets] : []);
  narrateLog("_targets:", workflow._targets ? [...workflow._targets] : []);
  narrateLog("failedSaves:", workflow.failedSaves ? [...workflow.failedSaves] : []);
  narrateLog("preSelectedTargets:", workflow.preSelectedTargets ? [...workflow.preSelectedTargets] : []);
  */

  // TURN EVERYTHING INTO ARRAYS
  const pools = [
    workflow.hitTargets ? [...workflow.hitTargets] : [],
    workflow.preSelectedTargets ? [...workflow.preSelectedTargets] : [],
    Array.isArray(workflow.targets) ? workflow.targets : [],
    workflow._targets ? [...workflow._targets] : [],
    workflow.failedSaves ? [...workflow.failedSaves] : []
  ];

  let NARRATION_INTERNAL_TARGET = null;

  // LOOP OVER ALL POOLS UNTIL WE FIND A TOKEN
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    if (pool && pool.length > 0) {
      NARRATION_INTERNAL_TARGET = pool[0];
      narrateLog(`🎯 Selected target from pool index ${i}:`, NARRATION_INTERNAL_TARGET);
      break;
    }
  }

  narrateLog("🎯 Final chosen target:", NARRATION_INTERNAL_TARGET);

  // VALIDATE
  if (!NARRATION_INTERNAL_TARGET || typeof NARRATION_INTERNAL_TARGET.x !== "number") {
    console.warn("❌ NO VALID TARGET FOUND WITH COORDINATES.", NARRATION_INTERNAL_TARGET);
    return;
  }

  narrateLog("✔ Target has coords:", NARRATION_INTERNAL_TARGET.x, NARRATION_INTERNAL_TARGET.y);

  // Now safe to compute distance/path
  const attacker = workflow.token;
  // 1. Horizontal distance along grid
  const path = [{ x: attacker.x, y: attacker.y }, { x: NARRATION_INTERNAL_TARGET.x, y: NARRATION_INTERNAL_TARGET.y }];

  const gridDistance = canvas.grid.measurePath(path).distance;

  // 2. Vertical elevation difference
  const dz = (NARRATION_INTERNAL_TARGET.document.elevation ?? 0) - (attacker.document.elevation ?? 0);

  // 3. True 3D distance
  const distance3D = Math.hypot(gridDistance, dz);
  narrateLog(`🗡️ [Combat Narration] Distance (3D): ${distance3D.toFixed(1)} ft`);

  // Check if this item actually rolled an attack
  const hasAttack = workflow.attackRoll !== undefined;

  // Optional: Check if the item has a defined action type
  const actionType = workflow.item.system.actionType;
  const isAttackAction = ["mwak", "rwak", "msak", "rsak"].includes(actionType); // melee/ranged weapon/spell attack

  const isSaveSpell = workflow.saveDC !== undefined;
  narrateLog(workflow);

if(!isSaveSpell && !isAttackAction && !hasAttack){
  console.warn("⚠️ [Combat Narration] Not an attack or save spell");
  //narrateLog(workflow);
  return;
}

  // Ensure the cache exists ASAP
  if (!game.combatNarrationCache) game.combatNarrationCache = {};

  const properties = item.system?.properties;
  const isAmmo = properties?.has("amm");
  const isThrown = properties?.has("thr");

  let damageTypes = new Set();

// ✅ 1. Modern (DnD5e 4.x) activity-based types
const activities = Object.values(item.system?.activities || {});
for (const act of activities) {
  if (!act.damage?.parts) continue;
  for (const part of act.damage.parts) {
    for (const dmg of part.types || []) {
      damageTypes.add(dmg.toLowerCase());
    }
  }
}

// ✅ 2. Legacy weapon support
const legacyTypes = item?.system?.damage?.base?.types;
if (legacyTypes && legacyTypes instanceof Set) {
  for (const type of legacyTypes) {
    damageTypes.add(type.toLowerCase());
  }
}

// ✅ 3. Fallback: some spells still use item.system.damage.parts directly
const fallbackParts = item.system?.damage?.parts || [];
for (const [formula, type] of fallbackParts) {
  if (type) damageTypes.add(type.toLowerCase());
}

  

  const doesDamage = damageTypes.size > 0;

  // 🪄 Skip hit/miss narration for non-damaging spells
  if (item.type === "spell" && !doesDamage) {
    narrateLog(`🪄 [Spell Narration] ${item.name} doesn't deal damage, skipping combat narration`);
    return;
  }

  const elementalTypes = ["fire", "cold", "lightning", "acid", "necrotic", "radiant", "force", "psychic", "thunder"];
  const physicalTypes = ["slashing", "piercing", "bludgeoning"];

  // ✅ Unified weaponType logic
  let weaponType = null;

  for (const type of damageTypes) {
    if (elementalTypes.includes(type)) {
      weaponType = type;
      break;
    }
  }
  if (!weaponType) {
    for (const type of damageTypes) {
      if (physicalTypes.includes(type)) {
        weaponType = type;
        break;
      }
    }
  }

  // Overrides (for ammo/thrown weapons)
  if (isAmmo){
     weaponType = "bow";
  }
  else if (isThrown){
    //a weapon may have thrown property but you're still using it as melee since the target is close.
    if(distance3D > 6){
      weaponType = "thrown";
    } 
  } 

  narrateLog("🎯 weaponType:", weaponType);



  // Fallback based on name
  if (!weaponType || weaponType == "piercing") {
    const name = item.name.toLowerCase();

    narrateLog("Weapon Name:", name);

    if (name.includes("sword") || name.includes("axe") || name.includes("scimitar")) {
      weaponType = "slashing";
    } else if (name.includes("dagger") || name.includes("spear") || name.includes("rapier")){
      weaponType = "piercing";
    } else if (name.includes("mace") || name.includes("hammer") || name.includes("club")) {
      weaponType = "bludgeoning";
    } else if (name.includes("lunar")) {
      weaponType = "radiant";
    } else if (name.includes("flaming") || name.includes("explosive")) {
      weaponType = "fire";
    } else if (name.includes("thunder")) {
      weaponType = "thunder";
    } else if (name.includes("arrow") || name.includes("bow")) {
      weaponType = "bow";
    } else {
    weaponType = "bludgeoning";
    }
  }

  //determine the type of damage with the greatest value
  let highest = { type: null, amount: 0 };
  if(damageDetails){
    for (let d of damageDetails) {
    narrateLog(`➕ Damage detail: ${d.type} - ${d.damage}`);
    if (d.damage > highest.amount) highest = { type: d.type, amount: d.damage };
    }
  }
  
  
  // 🔁 Override weaponType based on actual damage dealt only if current weaponType is bludgeoning (our fallback). Only run this code if it's a hit.
  if(weaponType == "bludgeoning" && damageDetails){
    const actualDamageType = highest.type?.toLowerCase?.();
    if (actualDamageType) {
      if (elementalTypes.includes(actualDamageType)) {
        weaponType = actualDamageType;
      } else if (physicalTypes.includes(actualDamageType)) {
        weaponType = actualDamageType;
      } else {
        // If it's not a known type, keep existing value or fallback to bludgeoning
        weaponType = weaponType || "bludgeoning";
      }
      narrateLog(`🧬 Overriding weaponType based on damageDetail: ${weaponType}`);
    }
  }

  narrateLog("🎯 Final weaponType:", weaponType);

  const folderPath = `modules/combat-narration/sounds/`;

  // 🟥 MISS HANDLING
  if (hitTargets.length === 0 || (isSaveSpell && workflow.failedSaves?.size === 0)) {
    narrateLog("❌ [Combat Narration] Attack missed!");

    const severity = "miss";
    const key = `${weaponType}_miss`;
    let variation = "001";

    const basePattern = `${key}_`;
    const files = await FilePicker.browse("data", folderPath);
    const matchingFiles = files.files.filter(f => {
      const fileName = f.split("/").pop();
      return fileName.startsWith(basePattern) && fileName.endsWith(".ogg");
    });

    narrateLog(`🎯 Found ${matchingFiles.length} miss files for ${weaponType}.`);

    if (matchingFiles.length > 0) {
      const lastUsed = game.combatNarrationCache[key] || null;
      let attempts = 0;
      do {
        const randomIndex = Math.floor(Math.random() * matchingFiles.length);
        const fileName = matchingFiles[randomIndex].split("/").pop();
        variation = fileName.replace(basePattern, "").replace(".ogg", "");
        attempts++;
      } while (variation === lastUsed && attempts < 10);

      game.combatNarrationCache[key] = variation;
      const filePath = `${folderPath}${key}_${variation}.ogg`;
      narrateLog(`🔊 Playing miss audio: ${filePath}`);
      AudioHelper.play({ src: filePath, volume: 1.0, autoplay: true, loop: false }, true);
    } else {
      console.warn("⚠️ No matching miss audio files found.");
    }

    return;
  }

  // ✅ HIT HANDLING
  const target = hitTargets[0];
  const targetHP = target.actor.system.attributes.hp;
  const preHP = targetHP.value + workflow.damageTotal;
  const postHP = targetHP.value;

  narrateLog(`📌 Actor: ${actor.name}, Target: ${target.name}`);
  narrateLog(`🧮 Target HP: ${preHP} → ${postHP}`);

  //determine severity
  let severity = "minor";
  const totalDamage = workflow.damageTotal;

  if (postHP <= 0) {
    severity = "death";
  } else {
    const ratio = totalDamage / preHP;
    if (ratio > 0.7) severity = "severe";
    else if (ratio > 0.3) severity = "moderate";
  }

  narrateLog(`🔥 Damage Type: ${weaponType}`);
  narrateLog(`📊 Severity: ${severity}`);

  const key = `${weaponType}_${severity}`;
  let variation = "001";

  const basePattern = `${key}_`;
  const files = await FilePicker.browse("data", folderPath);
  const matchingFiles = files.files.filter(f => {
    const fileName = f.split("/").pop();
    return fileName.startsWith(basePattern) && fileName.endsWith(".ogg");
  });

  narrateLog(`🎧 Found ${matchingFiles.length} hit files.`);

  if (matchingFiles.length > 0) {
    const lastUsed = game.combatNarrationCache[key] || null;
    let attempts = 0;
    do {
      const randomIndex = Math.floor(Math.random() * matchingFiles.length);
      const fileName = matchingFiles[randomIndex].split("/").pop();
      variation = fileName.replace(basePattern, "").replace(".ogg", "");
      attempts++;
    } while (variation === lastUsed && attempts < 10);

    game.combatNarrationCache[key] = variation;
    const filePath = `${folderPath}${key}_${variation}.ogg`;
    narrateLog(`🔊 Playing hit audio: ${filePath}`);
    AudioHelper.play({ src: filePath, volume: 1.0, autoplay: true, loop: false }, true);
  } else {
    console.warn("⚠️ No matching hit audio files found.");
  }
});

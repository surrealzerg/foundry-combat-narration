Hooks.on("midi-qol.RollComplete", async (workflow) => {
  console.log("🗡️ [Combat Narration] RollComplete Hook triggered!");

  const item = workflow.item;
  const actor = item?.actor;
  const hitTargets = [...workflow.hitTargets];
  const damageDetails = workflow.damageDetail;

  if (!actor || !item || !workflow) {
    console.warn("⚠️ [Combat Narration] Missing actor, item, or workflow.");
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
    console.log(`🪄 [Spell Narration] ${item.name} doesn't deal damage, skipping combat narration`);
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
  if (isAmmo) weaponType = "bow";
  else if (isThrown) weaponType = "thrown";

  // Fallback based on name
  if (!weaponType) {
    const name = item.name.toLowerCase();
    if (name.includes("sword") || name.includes("axe") || name.includes("scimitar")) {
      weaponType = "slashing";
    } else if (name.includes("dagger") || name.includes("spear") || name.includes("rapier")) {
      weaponType = "piercing";
    } else if (name.includes("mace") || name.includes("hammer") || name.includes("club")) {
      weaponType = "bludgeoning";
    } else {
      weaponType = "bludgeoning";
    }
  }

  console.log("🎯 Final weaponType:", weaponType);

  const folderPath = `modules/combat-narration/sounds/`;

  // 🟥 MISS HANDLING
  if (hitTargets.length === 0) {
    console.log("❌ [Combat Narration] Attack missed!");

    const severity = "miss";
    const key = `${weaponType}_miss`;
    let variation = "001";

    const basePattern = `${key}_`;
    const files = await FilePicker.browse("data", folderPath);
    const matchingFiles = files.files.filter(f => {
      const fileName = f.split("/").pop();
      return fileName.startsWith(basePattern) && fileName.endsWith(".ogg");
    });

    console.log(`🎯 Found ${matchingFiles.length} miss files for ${weaponType}.`);

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
      console.log(`🔊 Playing miss audio: ${filePath}`);
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

  console.log(`📌 Actor: ${actor.name}, Target: ${target.name}`);
  console.log(`🧮 Target HP: ${preHP} → ${postHP}`);

  let highest = { type: null, amount: 0 };
  for (let d of damageDetails) {
    console.log(`➕ Damage detail: ${d.type} - ${d.damage}`);
    if (d.damage > highest.amount) highest = { type: d.type, amount: d.damage };
  }

  let severity = "minor";
  const totalDamage = workflow.damageTotal;

  if (postHP <= 0) {
    severity = "death";
  } else {
    const ratio = totalDamage / preHP;
    if (ratio > 0.7) severity = "severe";
    else if (ratio > 0.3) severity = "moderate";
  }

  console.log(`🔥 Damage Type: ${weaponType}`);
  console.log(`📊 Severity: ${severity}`);

  const key = `${weaponType}_${severity}`;
  let variation = "001";

  const basePattern = `${key}_`;
  const files = await FilePicker.browse("data", folderPath);
  const matchingFiles = files.files.filter(f => {
    const fileName = f.split("/").pop();
    return fileName.startsWith(basePattern) && fileName.endsWith(".ogg");
  });

  console.log(`🎧 Found ${matchingFiles.length} hit files.`);

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
    console.log(`🔊 Playing hit audio: ${filePath}`);
    AudioHelper.play({ src: filePath, volume: 1.0, autoplay: true, loop: false }, true);
  } else {
    console.warn("⚠️ No matching hit audio files found.");
  }
});

Hooks.on("midi-qol.RollComplete", async (workflow) => {
    console.log("🗡️ [Combat Narration] RollComplete Hook triggered!");
  
    const item = workflow.item;
    const actor = item?.actor;
    const target = [...workflow.hitTargets][0];
    const damageDetails = workflow.damageDetail;
  
    if (!actor || !target || !damageDetails?.length) {
      console.warn("⚠️ [Combat Narration] Missing actor, target, or damage details.");
      return;
    }
  
    const isPlayerCharacter = actor.hasPlayerOwner;
    if (!isPlayerCharacter) {
      console.log("🚫 [Combat Narration] Attacker is not player-controlled. Skipping.");
      return;
    }
  
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
  
    const damageType = highest.type || workflow.defaultDamageType || "bludgeoning"; // fallback
    const totalDamage = workflow.damageTotal;
  
    let severity = "minor";
    if (postHP <= 0) {
      severity = "death";
    } else {
      const ratio = totalDamage / preHP;
      if (ratio > 0.7) severity = "severe";
      else if (ratio > 0.3) severity = "moderate";
    }
  
    console.log(`🔥 Damage Type: ${damageType}`);
    console.log(`📊 Severity: ${severity}`);
  
    if (!game.combatNarrationCache) game.combatNarrationCache = {};
    const key = `${damageType}_${severity}`;
    let variation = "001";
  
    const folderPath = `modules/combat-narration/sounds/`;
    const basePattern = `${damageType}_${severity}_`;
    const files = await FilePicker.browse("data", folderPath);
    const matchingFiles = files.files.filter(f => {
      const fileName = f.split("/").pop();
      return fileName.startsWith(basePattern) && fileName.endsWith(".ogg");
    });
  
    console.log(`🎧 Found ${matchingFiles.length} matching files.`);
  
    if (matchingFiles.length > 0) {
      const lastUsed = game.combatNarrationCache[key] || null;
      let attempts = 0;
      do {
        const randomIndex = Math.floor(Math.random() * matchingFiles.length);
        const fileName = matchingFiles[randomIndex].split("/").pop();
        variation = fileName.replace(`${basePattern}`, "").replace(".ogg", "");
        attempts++;
      } while (variation === lastUsed && attempts < 10);
  
      game.combatNarrationCache[key] = variation;
    } else {
      console.warn("⚠️ No matching audio files found.");
      return;
    }
  
    const filePath = `${folderPath}${damageType}_${severity}_${variation}.ogg`;
    console.log(`🔊 Playing audio: ${filePath}`);
    AudioHelper.play({ src: filePath, volume: 1.0, autoplay: true, loop: false }, true);
  });
  
Install with module.json:
https://github.com/surrealzerg/foundry-combat-narration/releases/download/v1.1/module.json

2026-01-04 Added support for conditions (3 lines each). Audio for first matched condition is played unless target is dead.
	Supported conditions - blinded,charmed,deafened,grappled,incapacitated,invisible,paralyzed,petrified,poisoned,prone,restrained,stunned,exhausted
	
This module plays narration when damage is dealt.
As of 1/4/2026 there are 922 dialogue lines in the library.

Demo:
https://github.com/surrealzerg/foundry-combat-narration/raw/refs/heads/main/combat-narration.webm


There are 34 dialogue lines per non-core damage type:
	7 minor damage
	4 moderate damage
	4 severe damage
	4 death 
	5 not effective (immune)
	10 miss

Piercing, Slashing, and Bludgeoning have 20 minor, 20 moderate, 20 severe, 20 death, and 20 miss.

There are also monster specific dialogue lines for the below monsters
- Air Elemental (5 minor, 5 moderate, 5 severe, 5 death)
- Earth Elemental (5 minor, 5 moderate, 5 severe, 5 death)
- Fire Elemental (5 minor, 5 moderate, 5 severe, 5 death)
- Water Elemental (5 minor, 5 moderate, 5 severe, 5 death)
- Dragons (15 minor, 15 moderate, 15 severe, 15 death)

Additionally there is now support for fear spells
- 10 fear success lines
- 10 fear failure lines

Play.ht was with Earle used for the original 435 lines.
Cartesia using a voice clone of Earle is used for all expansions.

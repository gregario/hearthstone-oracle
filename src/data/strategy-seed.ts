import type Database from 'better-sqlite3';

// --- Archetypes ---

const ARCHETYPES = [
  {
    name: 'aggro',
    description: 'Rush the opponent down with cheap, aggressive minions and direct damage. End the game before the opponent can execute their gameplan.',
    gameplan: 'Play low-cost minions on curve, push face damage every turn, use burn spells to finish. Aim to win by turn 6-7 before opponent stabilises.',
    win_conditions: JSON.stringify(['Deal lethal face damage before opponent stabilises', 'Overwhelm with wide boards of small minions', 'Burn spells for final burst damage']),
    strengths: JSON.stringify(['Fast games', 'Punishes greedy/slow decks', 'Cheap to build', 'Consistent early pressure']),
    weaknesses: JSON.stringify(['Runs out of steam quickly', 'Vulnerable to board clears', 'Healing negates progress', 'Poor topdecks in late game']),
    example_decks: JSON.stringify(['Face Hunter', 'Pirate Warrior', 'Aggro Demon Hunter', 'Zoo Warlock', 'Aggro Paladin']),
  },
  {
    name: 'control',
    description: 'Exhaust the opponent\'s resources through removal, healing, and board clears. Win in the late game with powerful finishers or through attrition.',
    gameplan: 'Survive the early game with removal and healing, clear threats efficiently, then deploy late-game win conditions once the opponent is out of resources.',
    win_conditions: JSON.stringify(['Attrition — outlast opponent\'s threats', 'Late-game finishers after board is stabilised', 'Fatigue advantage in long games']),
    strengths: JSON.stringify(['Beats aggro when stabilised', 'Powerful late-game threats', 'Efficient removal tools', 'High survivability']),
    weaknesses: JSON.stringify(['Loses to combo (ignores board state)', 'Can be out-valued by resource generators', 'Slow — vulnerable to early pressure', 'Draw-dependent for answers']),
    example_decks: JSON.stringify(['Control Warrior', 'Control Priest', 'Handlock', 'Control Shaman']),
  },
  {
    name: 'combo',
    description: 'Assemble specific cards for a game-ending combination, often an OTK (one-turn kill). Stall and draw until combo pieces are assembled.',
    gameplan: 'Draw through the deck as fast as possible while stalling with removal and freeze effects. Once all combo pieces are assembled, execute the lethal combo in a single turn.',
    win_conditions: JSON.stringify(['One-turn-kill combo', 'Game-ending card combination', 'Inevitable win condition that ignores board state']),
    strengths: JSON.stringify(['Inevitability — will win if game goes long enough', 'Ignores opponent\'s board state', 'Consistent win condition', 'Forces opponent to race']),
    weaknesses: JSON.stringify(['Vulnerable to hand disruption (Dirty Rat, Mutanus)', 'Dead cards before combo is assembled', 'Loses to fast aggro pressure', 'Drawing combo pieces in wrong order']),
    example_decks: JSON.stringify(['Miracle Rogue', 'OTK Mage', 'Combo Druid', 'Mecha\'thun Warlock', 'Quest Mage']),
  },
  {
    name: 'midrange',
    description: 'Play powerful standalone minions on curve, dominating the mid-game with efficient threats. Flexible enough to play aggro or control depending on matchup.',
    gameplan: 'Develop strong minions on turns 3-5, make efficient trades to maintain board control, then close out the game with mid-game pressure. Against aggro, play defensively; against control, push tempo.',
    win_conditions: JSON.stringify(['Board dominance through efficient minions', 'Snowballing mid-game threats', 'Flexible role — aggressor or defender as needed']),
    strengths: JSON.stringify(['Flexible gameplan adapts to matchup', 'Strong standalone threats', 'Good at efficient trades', 'Solid early-to-mid curve']),
    weaknesses: JSON.stringify(['Can be out-valued by control in long games', 'Out-tempoed by aggro on the draw', 'Jack of all trades, master of none', 'Dependent on drawing curve']),
    example_decks: JSON.stringify(['Midrange Hunter', 'Midrange Shaman', 'Dragon Paladin', 'Beast Hunter']),
  },
  {
    name: 'tempo',
    description: 'Seize and hold initiative through mana-efficient plays every turn. Snowball early board advantages into an insurmountable lead.',
    gameplan: 'Make the most efficient play each turn — develop threats while removing opponent\'s. Use cheap removal and weapons to maintain board while pushing damage. The opponent should never catch up.',
    win_conditions: JSON.stringify(['Snowball board advantage into lethal', 'Opponent can never catch up on board', 'Efficient resource usage creates permanent lead']),
    strengths: JSON.stringify(['Mana-efficient plays every turn', 'Strong early-mid game transitions', 'Punishes slow starts', 'Combines development with removal']),
    weaknesses: JSON.stringify(['Weak to board clears (loses entire board advantage)', 'Struggles in long games', 'Needs good draws to maintain tempo', 'Falls behind when going second']),
    example_decks: JSON.stringify(['Tempo Mage', 'Tempo Rogue', 'Tempo Demon Hunter', 'Secret Mage']),
  },
  {
    name: 'value',
    description: 'Generate more resources than the opponent through card generation, discover effects, and resource-extending mechanics. Win by never running out of threats.',
    gameplan: 'Play cards that generate additional cards or resources. Outlast the opponent by always having more options. Use discover and generation effects to find answers and threats as needed.',
    win_conditions: JSON.stringify(['Out-resource the opponent completely', 'Never run out of threats or answers', 'Win through card quality advantage over time']),
    strengths: JSON.stringify(['Beats control in grind games', 'Nearly impossible to fatigue', 'Adaptive — discovers answers on demand', 'High resource ceiling']),
    weaknesses: JSON.stringify(['Slow — vulnerable to aggro rushdown', 'Generated cards can be low quality', 'Inconsistent — discover is random', 'Struggles with proactive gameplans']),
    example_decks: JSON.stringify(['Value Priest', 'Reno decks', 'Galakrond decks', 'Casino Mage', 'Thief Rogue']),
  },
];

// --- Class Identities ---

const CLASS_IDENTITIES = [
  {
    class: 'Death Knight',
    identity: 'Master of undeath and corpse manipulation. Combines board presence with resource generation through the unique Corpse mechanic. Blends aggression with resilience.',
    hero_power_name: 'Ghoul Charge',
    hero_power_cost: 2,
    hero_power_effect: 'Summon a 1/1 Ghoul with Charge that dies at end of turn.',
    hero_power_implications: 'Provides immediate board interaction or face damage every turn. Generates Corpses passively. Excellent for finishing off damaged minions or pushing chip damage.',
    historical_archetypes: JSON.stringify(['Blood Death Knight (control/self-heal)', 'Frost Death Knight (burn/aggro)', 'Unholy Death Knight (board flood)', 'Rainbow Death Knight']),
    strengths: JSON.stringify(['Corpse mechanic provides unique resource', 'Strong board clears', 'Good self-sustain through Blood rune cards', 'Versatile with three rune builds']),
    weaknesses: JSON.stringify(['Rune restrictions limit deckbuilding flexibility', 'Can be resource-hungry', 'Hero power is low-impact compared to some classes', 'Newer class with smaller card pool historically']),
    early_game: 'Develop small undead minions and generate corpses. Use hero power for early trades or chip damage.',
    mid_game: 'Spend corpses on powerful mid-game effects. Deploy key rune-specific threats. Board clears available.',
    late_game: 'Powerful late-game payoffs from corpse accumulation. Blood builds become very hard to kill. Unholy builds flood relentlessly.',
  },
  {
    class: 'Demon Hunter',
    identity: 'Aggressive attacker who uses their hero as a weapon. Low-cost cards, attack buffs, and demon synergies. The most aggressive class identity in the game.',
    hero_power_name: 'Demon Claws',
    hero_power_cost: 1,
    hero_power_effect: '+1 Attack this turn.',
    hero_power_implications: 'Only 1-mana hero power in the game. Enables efficient early trades and consistent face damage. Makes weapon buffs extremely powerful. Always has something to do with leftover mana.',
    historical_archetypes: JSON.stringify(['Aggro Demon Hunter', 'Tempo Demon Hunter', 'OTK Demon Hunter', 'Big Demon Hunter', 'Relic Demon Hunter']),
    strengths: JSON.stringify(['Cheapest hero power enables tempo', 'Strong card draw mechanics', 'Excellent face damage', 'Efficient low-cost minions']),
    weaknesses: JSON.stringify(['Taking face damage from attacking', 'Limited board clears', 'Struggles in long games', 'Narrow class identity (mostly aggro)']),
    early_game: 'Extremely strong. 1-mana hero power plus cheap minions dominate early turns. Best early game of any class.',
    mid_game: 'Push damage with attack buffs and weapons. Strong draw effects keep hand full while maintaining pressure.',
    late_game: 'Generally weak unless built around specific combos or big demons. Prefers to end games before this point.',
  },
  {
    class: 'Druid',
    identity: 'Master of mana acceleration and Choose One flexibility. Ramps ahead in mana to deploy threats earlier than any other class. Nature and beast themes.',
    hero_power_name: 'Shapeshift',
    hero_power_cost: 2,
    hero_power_effect: '+1 Attack this turn. Gain 1 Armor.',
    hero_power_implications: 'Versatile but low-impact. The attack helps with early trades and the armor provides marginal survivability. Neither mode is strong alone, but flexibility has value.',
    historical_archetypes: JSON.stringify(['Ramp Druid', 'Token Druid', 'Combo Druid', 'Aggro Druid', 'Spell Druid', 'Big Druid']),
    strengths: JSON.stringify(['Mana ramp — play big threats early', 'Choose One provides flexibility', 'Strong card draw', 'Powerful large minions']),
    weaknesses: JSON.stringify(['Limited hard removal', 'Weak board clears', 'Vulnerable when ramping (tempo loss)', 'Struggles against wide boards']),
    early_game: 'Spend early turns ramping mana with Wild Growth, Innervate, etc. Sacrifice early board for future mana advantage.',
    mid_game: 'Deploy threats 2-3 turns ahead of curve. Opponents face 7-8 cost minions on turn 4-5. Choose One cards provide flexibility.',
    late_game: 'Overwhelming. Multiple large threats per turn. Combo potential with mana advantage. Token variants flood the board.',
  },
  {
    class: 'Hunter',
    identity: 'Relentless aggressor with inevitable hero power damage. Beast synergies, secrets, and direct damage. Every turn that passes, the Hunter gets closer to lethal.',
    hero_power_name: 'Steady Shot',
    hero_power_cost: 2,
    hero_power_effect: 'Deal 2 damage to the enemy hero.',
    hero_power_implications: 'The most aggressive hero power — guaranteed face damage every turn regardless of board state. Creates a built-in clock. Opponents must end the game or die. Cannot target minions, limiting flexibility.',
    historical_archetypes: JSON.stringify(['Face Hunter', 'Midrange Hunter', 'Beast Hunter', 'Deathrattle Hunter', 'Secret Hunter', 'Spell Hunter']),
    strengths: JSON.stringify(['Inevitable hero power damage', 'Strong beast synergies', 'Excellent secrets', 'Consistent face damage']),
    weaknesses: JSON.stringify(['Hero power cannot interact with board', 'Limited card draw', 'Poor comeback mechanics', 'Struggles when behind on board']),
    early_game: 'Deploy cheap beasts and secrets. Start applying face pressure immediately. Hero power adds 2 damage per turn baseline.',
    mid_game: 'Powerful mid-game beasts and weapons push damage. Secrets disrupt opponent\'s plans. Kill command and other burn available.',
    late_game: 'Weak in extended games. Hero power ensures inevitability but damage per turn is low. Must close before opponent stabilises.',
  },
  {
    class: 'Mage',
    identity: 'Master of spells, direct damage, and board control through AoE. Freeze effects, secrets, and spell synergies. The quintessential spell-based class.',
    hero_power_name: 'Fireblast',
    hero_power_cost: 2,
    hero_power_effect: 'Deal 1 damage to any target.',
    hero_power_implications: 'Flexible targeting (any character) makes it excellent for board control. Pings off divine shields, finishes 1-health minions, enables efficient trades. Can also push face damage. Most versatile hero power.',
    historical_archetypes: JSON.stringify(['Tempo Mage', 'Freeze Mage', 'Control Mage', 'Secret Mage', 'Quest Mage', 'Big Spell Mage', 'Casino Mage']),
    strengths: JSON.stringify(['Powerful board clears (Flamestrike, Blizzard)', 'Flexible hero power', 'Strong spell synergies', 'Freeze effects stall games', 'Direct burn damage']),
    weaknesses: JSON.stringify(['Relies on spells over minions', 'Vulnerable to weapon/attack pressure', 'Burn can be healed through', 'Random effects add inconsistency']),
    early_game: 'Use hero power and cheap spells to control board. Secrets provide tempo. Spell synergy minions begin building advantage.',
    mid_game: 'AoE clears (Flamestrike, Blizzard) control the board. Spell damage minions amplify burn. Freeze effects stall aggression.',
    late_game: 'Powerful burn combos for lethal. Big spell payoffs. Quest/combo finishers. Generated spells provide late-game value.',
  },
  {
    class: 'Paladin',
    identity: 'The army builder. Floods the board with Silver Hand Recruits and buffs them into real threats. Divine shields, healing, and board-wide buffs define the class.',
    hero_power_name: 'Reinforce',
    hero_power_cost: 2,
    hero_power_effect: 'Summon a 1/1 Silver Hand Recruit.',
    hero_power_implications: 'Generates board presence every turn. Alone each recruit is weak, but synergies with buffs, Silver Hand support cards, and board-wide effects make them powerful. Guarantees something to buff.',
    historical_archetypes: JSON.stringify(['Aggro Paladin', 'Midrange Paladin', 'Control Paladin', 'Secret Paladin', 'Murloc Paladin', 'Libram Paladin', 'Dude Paladin']),
    strengths: JSON.stringify(['Board-wide buffs turn recruits into threats', 'Divine Shield provides resilience', 'Strong healing and survivability', 'Excellent at building wide boards']),
    weaknesses: JSON.stringify(['Hero power creates weak 1/1s alone', 'Vulnerable to AoE board clears', 'Buffs are wasted without board', 'Limited card draw options']),
    early_game: 'Develop cheap minions and recruits. Apply buffs to build board advantage. Secrets provide early tempo.',
    mid_game: 'Board-wide buffs turn wide boards into lethal threats. Divine shield minions are hard to remove efficiently. Strong mid-game curve.',
    late_game: 'Tirion and other legendary finishers. Healing and divine shields extend survivability. Can grind with recruit generation.',
  },
  {
    class: 'Priest',
    identity: 'The healer and controller. Keeps minions alive, steals opponent\'s resources, and wins through attrition. Shadow spells add burst damage potential.',
    hero_power_name: 'Lesser Heal',
    hero_power_cost: 2,
    hero_power_effect: 'Restore 2 Health to any target.',
    hero_power_implications: 'Keeps minions alive for value trades. Sustains health total against aggro. Synergises with high-health minions and "while damaged" effects. Can target any character for flexibility.',
    historical_archetypes: JSON.stringify(['Control Priest', 'Combo Priest (Inner Fire)', 'Resurrect Priest', 'Shadow Priest', 'Thief Priest', 'Value Priest', 'Miracle Priest']),
    strengths: JSON.stringify(['Excellent removal (Shadow Word, Holy Nova)', 'Strong healing sustains through aggro', 'Resource generation from opponent\'s class', 'Board clears available']),
    weaknesses: JSON.stringify(['Slow and reactive', 'Limited proactive game plan', 'Struggles to close out games', 'Weak against combo decks']),
    early_game: 'Reactive — remove early threats and heal. Develop high-health minions. Limited proactive plays.',
    mid_game: 'Board clears and targeted removal handle mid-game threats. Start generating value through steal and discover effects.',
    late_game: 'Strongest phase. Out-heal and out-value opponents. Resurrect effects re-deploy threats. Shadow burst can finish games.',
  },
  {
    class: 'Rogue',
    identity: 'The tempo and combo specialist. Cheap spells chain together for explosive turns. Weapons, stealth, and efficient removal define a hit-and-run playstyle.',
    hero_power_name: 'Dagger Mastery',
    hero_power_cost: 2,
    hero_power_effect: 'Equip a 1/2 Dagger.',
    hero_power_implications: 'Provides 2 damage over 2 turns for 2 mana. Excellent for early board control. Weapon buffs (like Deadly Poison) make it extremely efficient. Enables combo cards through cheap attacks.',
    historical_archetypes: JSON.stringify(['Miracle Rogue', 'Tempo Rogue', 'Thief Rogue', 'Aggro Rogue', 'Pirate Rogue', 'Deathrattle Rogue', 'Mill Rogue']),
    strengths: JSON.stringify(['Cheap spells enable explosive combo turns', 'Excellent card draw (Gadgetzan, Sprint)', 'Strong tempo plays', 'Efficient single-target removal']),
    weaknesses: JSON.stringify(['No healing — health is a finite resource', 'No board clears (AoE)', 'Taking face damage from weapon attacks', 'Combo-dependent — weak without setup']),
    early_game: 'Dagger controls early minions. Cheap spells develop board while removing threats. Backstab and SI:7 Agent are classic tempo tools.',
    mid_game: 'Explosive combo turns with Gadgetzan Auctioneer or similar draw engines. Chain cheap spells for massive tempo swings.',
    late_game: 'Must win before this point in most builds. Miracle/combo variants can assemble game-ending combos. No sustain makes late-game difficult.',
  },
  {
    class: 'Shaman',
    identity: 'Master of elements and overload. Powerful effects at reduced mana cost, paid back next turn. Totems provide incremental value. Versatile with both aggro and control tools.',
    hero_power_name: 'Totemic Call',
    hero_power_cost: 2,
    hero_power_effect: 'Summon a random basic Totem (Healing, Searing, Stoneclaw, or Wrath of Air).',
    hero_power_implications: 'Random but each totem has utility: Spell Damage +1, Taunt, healing, or a 1/1 body. Builds incremental board presence. Totem synergy cards can leverage these. Randomness is a downside.',
    historical_archetypes: JSON.stringify(['Aggro Shaman', 'Midrange Shaman', 'Control Shaman', 'Totem Shaman', 'Evolve Shaman', 'Elemental Shaman', 'Murloc Shaman']),
    strengths: JSON.stringify(['Overload enables above-curve plays', 'Versatile — aggro to control builds', 'Strong AoE and removal', 'Evolve/transform effects are unique']),
    weaknesses: JSON.stringify(['Overload restricts next turn\'s mana', 'Random hero power is inconsistent', 'Can fall behind when overloaded', 'Totem rolls can be bad at wrong time']),
    early_game: 'Overload cards like Lightning Bolt provide above-curve power. Totems build incremental board. Strong early tempo possible.',
    mid_game: 'Powerful mid-game with cards like Thing from Below. Evolve effects create massive boards. AoE handles opponent\'s board.',
    late_game: 'Bloodlust and Windfury provide burst lethals. Control builds have strong value generation. Evolve can highroll into late-game threats.',
  },
  {
    class: 'Warlock',
    identity: 'The deal-maker. Trades health for cards through the most powerful hero power in the game. Demon synergies, self-damage, and board control through sacrifice.',
    hero_power_name: 'Life Tap',
    hero_power_cost: 2,
    hero_power_effect: 'Draw a card. Take 2 damage.',
    hero_power_implications: 'The best hero power in the game for card advantage. Guarantees you never run out of resources. Health becomes a resource to be spent. Enables aggressive zoo strategies (always have cards) and control (always have answers).',
    historical_archetypes: JSON.stringify(['Zoo Warlock', 'Handlock', 'Control Warlock', 'Cube Warlock', 'Discard Warlock', 'Reno Warlock', 'Pain Warlock']),
    strengths: JSON.stringify(['Life Tap provides unmatched card draw', 'Never runs out of resources', 'Powerful demon synergies', 'Strong board clears (Defile, Twisting Nether)']),
    weaknesses: JSON.stringify(['Self-damage from hero power', 'Health is always under pressure', 'Demon costs often have drawbacks', 'Vulnerable to burst damage']),
    early_game: 'Zoo: flood board with cheap minions, tap for refuel. Control: tap to find answers, play removal. Life Tap makes both strategies consistent.',
    mid_game: 'Strong demons and synergy cards come online. Board clears handle aggro. Giants become cheap from tapping (Handlock).',
    late_game: 'Powerful demons and Lord Jaraxxus/other finishers. Card advantage from tapping all game means full hand of threats. Self-damage becomes risky.',
  },
  {
    class: 'Warrior',
    identity: 'The armoured fortress. Stacks armor to survive, uses weapons for efficient removal, and commands powerful Taunt minions. The premier control class.',
    hero_power_name: 'Armor Up!',
    hero_power_cost: 2,
    hero_power_effect: 'Gain 2 Armor.',
    hero_power_implications: 'Armor stacks infinitely above 30 health, making Warrior the hardest class to burst down. Pure survivability — no board impact. Enables fatigue strategies and makes armor synergy cards powerful.',
    historical_archetypes: JSON.stringify(['Control Warrior', 'Pirate Warrior', 'Taunt Warrior', 'Enrage Warrior', 'Tempo Warrior', 'Galakrond Warrior', 'Bomb Warrior']),
    strengths: JSON.stringify(['Infinite armor stacking', 'Excellent weapons for removal', 'Strong Taunt minions', 'Best board clears (Brawl, Reckoning)']),
    weaknesses: JSON.stringify(['Hero power has no board impact', 'Armor is irrelevant against combo', 'Limited card draw', 'Reactive — struggles to be proactive']),
    early_game: 'Weapons handle early threats efficiently. Armor Up provides survivability buffer. Pirates enable aggressive starts in tempo builds.',
    mid_game: 'Weapons and removal clear mid-game threats. Brawl handles wide boards. Armor total starts building up significantly.',
    late_game: 'Premier control class. Massive armor totals, powerful legendaries, and board clears. Fatigue is a real win condition. Pirate builds must win before this.',
  },
];

// --- Matchup Framework ---

const MATCHUP_FRAMEWORK = [
  // aggro matchups
  {
    archetype_a: 'aggro', archetype_b: 'aggro', favoured: 'even',
    reasoning: 'Mirror matchup — whoever gets on board first and controls trades wins. Going first is a significant advantage.',
    key_tension: 'Board control vs face damage — trading to protect your board or ignoring their board to race.',
    archetype_a_priority: 'Get on board first, make efficient trades to protect your minions',
    archetype_b_priority: 'Get on board first, make efficient trades to protect your minions',
  },
  {
    archetype_a: 'aggro', archetype_b: 'control', favoured: 'aggro',
    reasoning: 'Aggro is favoured if it pressures before control stabilises. Control wins if it survives to deploy removal and healing. The critical window is turns 4-6.',
    key_tension: 'Can aggro deal enough damage before control clears the board and heals? Every heal or clear extends control\'s survival.',
    archetype_a_priority: 'Maximum face damage — ignore trades unless they protect lethal damage minions. End game before board clears.',
    archetype_b_priority: 'Survive — use all removal and healing to reach late game. One big board clear can swing the game.',
  },
  {
    archetype_a: 'aggro', archetype_b: 'combo', favoured: 'aggro',
    reasoning: 'Aggro is heavily favoured — combo needs time to draw pieces and aggro denies that time. Combo has dead cards (combo pieces) that don\'t help survive.',
    key_tension: 'Speed vs assembly — can combo survive long enough to draw all pieces? Aggro presents a clock combo cannot ignore.',
    archetype_a_priority: 'Kill them before combo assembles. Maximum pressure. Their hand is full of cards that don\'t affect the board.',
    archetype_b_priority: 'Survive at all costs. Use any stall tools. Each turn alive is one draw closer to combo.',
  },
  {
    archetype_a: 'aggro', archetype_b: 'midrange', favoured: 'midrange',
    reasoning: 'Midrange slightly favoured — bigger minions win trades against aggro\'s smaller ones. But aggro can win by going under midrange\'s curve.',
    key_tension: 'Size vs speed — midrange minions are bigger but slower. If aggro builds a board before midrange\'s 3-drops arrive, aggro can overwhelm.',
    archetype_a_priority: 'Build board before their bigger minions arrive. Go wide to prevent efficient trades. Push face when possible.',
    archetype_b_priority: 'Contest board with efficient mid-cost minions. Trade favourably with bigger stats. Stabilise by turn 4-5.',
  },
  {
    archetype_a: 'aggro', archetype_b: 'tempo', favoured: 'even',
    reasoning: 'Close matchup. Both fight for early board. Tempo has better removal but aggro has more reach. Whoever controls the board early usually wins.',
    key_tension: 'Both want early board control. Tempo tries to out-trade while aggro tries to out-damage.',
    archetype_a_priority: 'Establish board presence before tempo\'s removal comes online. Save burn for face.',
    archetype_b_priority: 'Use efficient removal to control aggro\'s board. Develop threats while removing theirs.',
  },
  {
    archetype_a: 'aggro', archetype_b: 'value', favoured: 'aggro',
    reasoning: 'Aggro heavily favoured. Value decks are slow to set up and their generated resources come too late. Aggro ends the game before value matters.',
    key_tension: 'Speed vs resources. Value decks need many turns to generate their advantage; aggro aims to kill in 6-7 turns.',
    archetype_a_priority: 'End the game fast. Their cards are slow and expensive. Every turn they survive they generate more resources.',
    archetype_b_priority: 'Survive the initial onslaught. If you stabilise, your resource advantage takes over. Play defensively early.',
  },
  // control matchups
  {
    archetype_a: 'control', archetype_b: 'control', favoured: 'even',
    reasoning: 'Control mirror is a value and fatigue battle. The player who generates more resources or manages fatigue better wins. Games go very long.',
    key_tension: 'Resource management is paramount. Every card matters. Fatigue damage becomes the clock.',
    archetype_a_priority: 'Out-value opponent. Don\'t waste removal on small threats. Save answers for their win conditions.',
    archetype_b_priority: 'Out-value opponent. Don\'t waste removal on small threats. Save answers for their win conditions.',
  },
  {
    archetype_a: 'control', archetype_b: 'combo', favoured: 'combo',
    reasoning: 'Combo is favoured — control\'s removal and healing are irrelevant against an OTK. Combo ignores everything control does and wins inevitably.',
    key_tension: 'Control\'s gameplan is invalidated. Armor and healing don\'t matter against OTK. Only hand disruption (Dirty Rat, Mutanus) can save control.',
    archetype_a_priority: 'Apply pressure — force combo to use stall cards defensively. If you have hand disruption, time it to hit combo pieces.',
    archetype_b_priority: 'Draw your deck. Control gives you all the time you need. Stall is easy against a reactive opponent.',
  },
  {
    archetype_a: 'control', archetype_b: 'midrange', favoured: 'control',
    reasoning: 'Control favoured — enough removal to handle midrange\'s threats one by one. Midrange lacks the inevitability to overwhelm control\'s answers.',
    key_tension: 'Can midrange stick enough threats to overwhelm removal? Or does control answer every threat and win in the late game?',
    archetype_a_priority: 'Answer each threat efficiently. Don\'t waste board clears on single minions. Save big removal for big threats.',
    archetype_b_priority: 'Play threats every turn. Force awkward removal usage. Try to stick a minion that snowballs before they can clear.',
  },
  {
    archetype_a: 'control', archetype_b: 'tempo', favoured: 'control',
    reasoning: 'Control slightly favoured. Board clears invalidate tempo\'s snowball strategy. Tempo must win before control draws its clears.',
    key_tension: 'Tempo builds board advantage; control resets it. If tempo can push enough damage before the first board clear, they win.',
    archetype_a_priority: 'Survive early tempo plays. One well-timed board clear resets the game in your favour. Then out-value them.',
    archetype_b_priority: 'Push maximum tempo early. Force damage before board clears. Diversify threats to play around AoE.',
  },
  {
    archetype_a: 'control', archetype_b: 'value', favoured: 'value',
    reasoning: 'Value is favoured in the grind. Control runs out of threats/answers; value generates infinite resources. Control must find a way to close the game.',
    key_tension: 'Value out-resources control. Control has better individual cards but value has more of them. Fatigue heavily favours value.',
    archetype_a_priority: 'Find a proactive win condition. Don\'t just react — you\'ll run out of answers. Apply pressure when possible.',
    archetype_b_priority: 'Generate resources relentlessly. Don\'t overextend into clears. Grind them out of answers one by one.',
  },
  // combo matchups
  {
    archetype_a: 'combo', archetype_b: 'combo', favoured: 'even',
    reasoning: 'Combo mirror — whoever assembles their combo first wins. Comes down to draw speed and which combo requires fewer pieces.',
    key_tension: 'A race to assemble. Neither player interacts with the other\'s board much. Card draw speed is everything.',
    archetype_a_priority: 'Draw as fast as possible. Your combo must be faster than theirs. Ignore their board entirely.',
    archetype_b_priority: 'Draw as fast as possible. Your combo must be faster than theirs. Ignore their board entirely.',
  },
  {
    archetype_a: 'combo', archetype_b: 'midrange', favoured: 'even',
    reasoning: 'Roughly even. Midrange can apply enough pressure to threaten lethal before combo assembles, but combo can stall and find pieces if midrange doesn\'t curve well.',
    key_tension: 'Midrange\'s clock vs combo\'s draw speed. If midrange applies consistent pressure, combo can\'t afford to spend turns just drawing.',
    archetype_a_priority: 'Stall and draw. Use freeze/removal to buy time. Every turn is one draw closer to combo.',
    archetype_b_priority: 'Apply consistent pressure. Don\'t overcommit to board (they have stall). Steady damage each turn.',
  },
  {
    archetype_a: 'combo', archetype_b: 'tempo', favoured: 'tempo',
    reasoning: 'Tempo is slightly favoured. Tempo\'s early pressure and efficient plays create a fast clock. Combo struggles to stall against a tempo deck that develops and removes simultaneously.',
    key_tension: 'Tempo applies pressure while being mana-efficient — combo\'s stall tools are less effective against tempo than pure aggro.',
    archetype_a_priority: 'Survive tempo\'s early game. Their threats are efficient but not as fast as aggro. Find removal for key snowball minions.',
    archetype_b_priority: 'Apply pressure while removing their stall minions. Don\'t let them set up draw engines. Maintain initiative.',
  },
  {
    archetype_a: 'combo', archetype_b: 'value', favoured: 'combo',
    reasoning: 'Combo favoured. Value is slow and gives combo all the time needed to assemble pieces. Value\'s resource generation is irrelevant against an OTK.',
    key_tension: 'Value cannot pressure combo fast enough. Generated resources don\'t matter if combo kills from hand in one turn.',
    archetype_a_priority: 'Draw freely. Value decks apply almost no pressure. Take your time assembling the combo.',
    archetype_b_priority: 'Apply whatever pressure you can. Discover disruption if available. You\'re on a timer you can\'t control.',
  },
  // midrange matchups
  {
    archetype_a: 'midrange', archetype_b: 'midrange', favoured: 'even',
    reasoning: 'Mirror matchup — board control is everything. Whoever curves out better and makes more efficient trades wins. Going first is significant.',
    key_tension: 'Curve and board control. Each player tries to develop bigger threats on curve and trade up.',
    archetype_a_priority: 'Curve out and control the board. Efficient trades are critical. Snowball any board advantage.',
    archetype_b_priority: 'Curve out and control the board. Efficient trades are critical. Snowball any board advantage.',
  },
  {
    archetype_a: 'midrange', archetype_b: 'tempo', favoured: 'even',
    reasoning: 'Close matchup. Both fight for board control with efficient plays. Tempo has better removal; midrange has bigger minions. Depends on specific lists.',
    key_tension: 'Efficiency vs stats. Tempo makes more mana-efficient plays; midrange has individually stronger cards.',
    archetype_a_priority: 'Deploy bigger threats that trade favourably. Force tempo to spend removal reactively.',
    archetype_b_priority: 'Use efficient removal to handle their threats while developing your own. Maintain initiative.',
  },
  {
    archetype_a: 'midrange', archetype_b: 'value', favoured: 'midrange',
    reasoning: 'Midrange slightly favoured. Can pressure value decks before they generate enough resources. Value decks struggle against proactive mid-game threats.',
    key_tension: 'Midrange\'s proactive threats vs value\'s reactive generation. If midrange maintains board pressure, value can\'t stabilise.',
    archetype_a_priority: 'Apply steady pressure every turn. Don\'t let them freely generate value. Close the game in mid-game.',
    archetype_b_priority: 'Survive mid-game pressure. Once you stabilise, your resource advantage takes over. Play defensively until then.',
  },
  // tempo matchups
  {
    archetype_a: 'tempo', archetype_b: 'tempo', favoured: 'even',
    reasoning: 'Mirror — whoever gets on board first and maintains initiative wins. Going first is a huge advantage. Efficient plays determine the outcome.',
    key_tension: 'Initiative is everything. The first player to lose board control usually loses the game.',
    archetype_a_priority: 'Seize board initiative. Make the most efficient play every turn. Never fall behind.',
    archetype_b_priority: 'Seize board initiative. Make the most efficient play every turn. Never fall behind.',
  },
  {
    archetype_a: 'tempo', archetype_b: 'value', favoured: 'tempo',
    reasoning: 'Tempo is favoured early and mid-game. Value needs too many turns to set up. Tempo ends the game before value\'s resource advantage matters.',
    key_tension: 'Speed vs resources. Tempo pressures before value can generate enough answers.',
    archetype_a_priority: 'Push tempo advantage early. End the game before their resource generation overwhelms you.',
    archetype_b_priority: 'Survive the tempo onslaught. If you reach late game with resources, you win. Play defensively.',
  },
  // value matchup
  {
    archetype_a: 'value', archetype_b: 'value', favoured: 'even',
    reasoning: 'Value mirror is a pure resource war. Whoever generates more and higher-quality cards wins. Games go to fatigue frequently.',
    key_tension: 'Card quality and generation speed. Both players have effectively infinite resources — it\'s about quality, not quantity.',
    archetype_a_priority: 'Generate the highest-quality resources. Save removal for their best threats. Manage fatigue.',
    archetype_b_priority: 'Generate the highest-quality resources. Save removal for their best threats. Manage fatigue.',
  },
];

// --- Game Concepts ---

const GAME_CONCEPTS = [
  {
    name: 'card advantage',
    category: 'fundamental',
    description: 'Having more cards (or more useful cards) in hand than your opponent. The player with more options has more flexibility to answer threats and deploy their own.',
    hearthstone_application: 'Warlock\'s Life Tap hero power is the ultimate card advantage tool. Board clears that destroy multiple minions with one card generate card advantage. 2-for-1 trades (one card killing two) build advantage over time.',
  },
  {
    name: 'tempo',
    category: 'fundamental',
    description: 'The pace of play and who holds the initiative on board. A tempo advantage means your board is more developed relative to mana spent.',
    hearthstone_application: 'Spending mana efficiently each turn (coining out a 2-drop on turn 1, playing on curve). Cards like Backstab (0 mana removal) are pure tempo. Going first gives a tempo advantage. Tempo is often traded for value and vice versa.',
  },
  {
    name: 'value',
    category: 'fundamental',
    description: 'Getting more impact per card played. A high-value card does more than one card\'s worth of work — either through card generation, multiple effects, or 2-for-1 trades.',
    hearthstone_application: 'Discover effects generate extra cards from one card played. Siphon Soul (destroy + heal) provides two effects. Trading a single minion into two enemy minions is a value trade. Value and tempo are often in tension — high-value plays are often slow.',
  },
  {
    name: 'board control',
    category: 'fundamental',
    description: 'Dominating the minion battlefield. The player who controls the board dictates trades, pressures the opponent, and forces reactive plays.',
    hearthstone_application: 'Trading efficiently with minions (using a 3/2 to kill their 2/3 after pinging with hero power). Taunts protect your board. Going first helps establish board control. Losing board control against aggro is often game-losing.',
  },
  {
    name: 'mana curve',
    category: 'fundamental',
    description: 'The distribution of card costs in your deck. A smooth curve means having playable cards at every mana point, ensuring you spend your mana efficiently each turn.',
    hearthstone_application: 'Aggro decks need low curves (mostly 1-3 cost) to apply early pressure. Control decks can afford gaps in their curve because they hero power on empty turns. Having a "1-2-3" opening (playing on curve for turns 1, 2, 3) is critical for tempo and aggro decks.',
  },
  {
    name: 'fatigue',
    category: 'hearthstone-specific',
    description: 'When your deck is empty, each draw attempt deals increasing damage (1, then 2, then 3, etc.). A unique Hearthstone mechanic that creates a natural game timer.',
    hearthstone_application: 'Relevant in control mirrors where both players exhaust their decks. Warlock\'s Life Tap accelerates fatigue. Cards that shuffle into your deck delay fatigue. Mill strategies (forcing opponent to draw) weaponise fatigue damage. Dead Man\'s Hand Warrior was the ultimate fatigue deck.',
  },
  {
    name: 'resource management',
    category: 'fundamental',
    description: 'Balancing the four resources — health, cards in hand, mana, and board presence. Spending one resource to gain another is the core decision of every turn.',
    hearthstone_application: 'Health IS a resource — Warlock pays health for cards (Life Tap), and this is often correct. Knowing when to take face damage to develop board. Using mana efficiently means not floating mana. Overcommitting to board (spending all cards) leaves you vulnerable to clears.',
  },
  {
    name: 'win condition',
    category: 'fundamental',
    description: 'The specific way your deck plans to win the game. Every deck needs a clear path to victory, and all other cards should support that path.',
    hearthstone_application: 'Aggro\'s win condition is face damage before opponent stabilises. Control wins through attrition and late-game threats. Combo wins through specific card combinations (e.g., Leeroy + Shadowstep). Identifying your win condition each game informs every decision — trade or go face, draw or develop, play for tempo or value.',
  },
];

// --- Seed function ---

export function seedStrategyKnowledge(db: Database.Database): void {
  const insertArchetype = db.prepare(`
    INSERT OR REPLACE INTO archetypes (name, description, gameplan, win_conditions, strengths, weaknesses, example_decks)
    VALUES (@name, @description, @gameplan, @win_conditions, @strengths, @weaknesses, @example_decks)
  `);

  const insertClass = db.prepare(`
    INSERT OR REPLACE INTO class_identities (class, identity, hero_power_name, hero_power_cost, hero_power_effect, hero_power_implications, historical_archetypes, strengths, weaknesses, early_game, mid_game, late_game)
    VALUES (@class, @identity, @hero_power_name, @hero_power_cost, @hero_power_effect, @hero_power_implications, @historical_archetypes, @strengths, @weaknesses, @early_game, @mid_game, @late_game)
  `);

  const insertMatchup = db.prepare(`
    INSERT OR REPLACE INTO matchup_framework (archetype_a, archetype_b, favoured, reasoning, key_tension, archetype_a_priority, archetype_b_priority)
    VALUES (@archetype_a, @archetype_b, @favoured, @reasoning, @key_tension, @archetype_a_priority, @archetype_b_priority)
  `);

  const insertConcept = db.prepare(`
    INSERT OR REPLACE INTO game_concepts (name, category, description, hearthstone_application)
    VALUES (@name, @category, @description, @hearthstone_application)
  `);

  const seedAll = db.transaction(() => {
    for (const archetype of ARCHETYPES) {
      insertArchetype.run(archetype);
    }
    for (const classIdentity of CLASS_IDENTITIES) {
      insertClass.run(classIdentity);
    }
    for (const matchup of MATCHUP_FRAMEWORK) {
      insertMatchup.run(matchup);
    }
    for (const concept of GAME_CONCEPTS) {
      insertConcept.run(concept);
    }
  });

  seedAll();
}

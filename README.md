# TOWERS - Tactical Strategy Game

A sophisticated web-based implementation of TOWERS, a symmetrical tactical-strategic wargame designed for two players. Build your army from a shared pool of unit templates and command cards, deploy onto a modular hex-based battlefield, and win by eliminating all enemy units in a single decisive battle.

## 🎮 Game Overview

TOWERS is intentionally symmetric: both players have access to the same pool of custom unit cards, command cards, terrain tiles, and rules. Players build armies using a point cap and take turns activating units to move, fight, support, or manipulate the battlefield. The game favors tactical positioning, logistics (supply), careful use of Command Points (CP), and long-term preservation of key units.

## 🌟 Key Features

### Core Game Features
- **Hex-based tactical combat** on a modular battlefield
- **Army building** with 100-point armies from shared unit pools
- **Single decisive battle** format with reserve deployment
- **Command Point (CP) economy** for tactical abilities and extra actions
- **Supply line mechanics** affecting unit performance
- **Morale system** with routing and retreat mechanics
- **Interactive dice combat** with visual feedback
- **Real-time game state management** with undo/redo capabilities

### Digital Implementation Features
- **Immersive game interface** with multiple view modes
- **Enhanced tooltips** showing detailed unit stats and abilities
- **Visual combat resolution** with animated dice rolling
- **Army builder** with drag-and-drop unit selection
- **Hex grid visualization** with terrain effects
- **Turn-based multiplayer** with player switching
- **Game state persistence** using Prisma database
- **Responsive design** optimized for desktop and tablet play

### Advanced Features
- **Auto-deployment** options for quick setup
- **Combat prediction** showing potential outcomes
- **Move history tracking** with replay capabilities
- **Multiple UI layouts** (compact, expanded, immersive)
- **Customizable overlays** and information panels
- **Rules explainer** with interactive examples
- **Game logging** for analysis and review

## 🎯 Game Rules Summary

### Victory Conditions
- **Game Victory**: Eliminate all enemy units (both deployed and in reserves)
- **Reserve Deployment**: Deploy units from reserves as actions during battle
- **Single Battle Format**: One decisive engagement determines the winner

### Core Mechanics

#### Turn Structure
- Each turn, players receive **4 Command Points (CP)** (max 6 stored)
- **3 activations per turn** (can buy more with CP)
- Each activation allows: unit movement/attack, reserve deployment (costs 1 activation), or command card play

#### Combat Resolution
Uses dice + stats for balanced strategy and unpredictability:
- **Attacker Value (AV)** = Base Attack + Modifiers + 1d6
- **Defender Value (DV)** = Base Defense + Modifiers + 1d6
- **Results**:
  - AV ≥ DV+3: Massive hit (2 HP damage)
  - AV > DV: Hit (1 HP damage)
  - AV = DV: Tie (both gain morale tokens)
  - AV < DV: Miss (attacker takes 1 HP)

#### Supply System
- Units must trace supply lines to friendly supply sources
- **Out of supply units**: -2 to attack/defense, gain morale tokens, eventual HP loss
- **Supply camps** can be built by Engineers or captured as objectives

#### Morale System
- Units gain morale tokens from combat ties, commander deaths, supply issues
- **3+ morale tokens** trigger morale checks
- Failed checks force retreats or cause HP damage

## 🏗️ Unit Types & Abilities

### Infantry Units

#### Militia (Light Infantry)
- **Cost**: 4 | **Move**: 2 | **HP**: 1 | **Melee**: 2 | **Defense**: 1 | **Supply**: 1
- **Ability**: None (cheap cannon fodder)

#### Spearmen (Heavy Infantry)
- **Cost**: 8 | **Move**: 2 | **HP**: 2 | **Melee**: 4 | **Defense**: 3 | **Supply**: 1
- **Ability**: +1 defense vs Cavalry when defending

#### Swordsmen (Heavy Infantry II)
- **Cost**: 10 | **Move**: 2 | **HP**: 2 | **Melee**: 5 | **Defense**: 3 | **Supply**: 1
- **Ability**: Balanced frontline unit

#### Pikemen (Anti-Cavalry)
- **Cost**: 9 | **Move**: 1 | **HP**: 2 | **Melee**: 3 | **Defense**: 4 | **Supply**: 1
- **Ability**: Cavalry attacking Pikemen suffer -2 to attack

### Cavalry Units

#### Cavalry (Light Horsemen)
- **Cost**: 12 | **Move**: 4 | **HP**: 2 | **Melee**: 5 | **Defense**: 2 | **Supply**: 2
- **Ability**: **Charge** - +2 attack if moved ≥2 hexes before attacking

#### Heavy Cavalry (Lancers)
- **Cost**: 16 | **Move**: 3 | **HP**: 3 | **Melee**: 7 | **Defense**: 3 | **Supply**: 3
- **Ability**: **Charge** +3 attack; +1 extra damage vs flanked units

### Ranged Units

#### Archers
- **Cost**: 10 | **Move**: 2 | **HP**: 1 | **Melee**: 1 | **Ranged**: 4 | **Defense**: 1 | **Supply**: 1
- **Ability**: **Volley** - 2-hex range; -1 attack if target adjacent

#### Skirmishers (Light Ranged)
- **Cost**: 6 | **Move**: 3 | **HP**: 1 | **Melee**: 1 | **Ranged**: 2 | **Defense**: 1 | **Supply**: 1
- **Ability**: Ignore difficult terrain movement penalties

#### Siege Engine (Ballista/Catapult)
- **Cost**: 18 | **Move**: 1 | **HP**: 3 | **Melee**: 1 | **Ranged**: 8 | **Defense**: 1 | **Supply**: 4
- **Ability**: **Siege Fire** - 2-hex range with area effect damage

### Support Units

#### Engineer
- **Cost**: 7 | **Move**: 2 | **HP**: 1 | **Melee**: 1 | **Defense**: 1 | **Supply**: 1
- **Ability**: Build Supply Camps (costs 2 CP, once per skirmish)

#### Soulcaster (Support Mage)
- **Cost**: 18 | **Move**: 2 | **HP**: 2 | **Melee**: 1 | **Ranged**: 1 | **Defense**: 2 | **Supply**: 3
- **Ability**: **Soulcast** (1x per skirmish) - Heal 1 HP to adjacent ally OR temporarily convert terrain

#### Commander (General)
- **Cost**: 20 | **Move**: 2 | **HP**: 2 | **Melee**: 2 | **Defense**: 3 | **Supply**: 2
- **Ability**: **Command Aura** - Adjacent allies gain +1 attack OR defense (choose each turn)

### Elite Units

#### Shardbearer (Elite Champion)
- **Cost**: 24 | **Move**: 3 | **HP**: 4 | **Melee**: 9 | **Defense**: 5 | **Supply**: 4
- **Ability**: **Radiant Might** - Immune to morale; wins ties; knockback on big victories

#### Skald/Bugler (Morale Support)
- **Cost**: 6 | **Move**: 2 | **HP**: 1 | **Melee**: 0 | **Defense**: 1 | **Supply**: 1
- **Ability**: Remove 1 morale token from adjacent allies (once per two turns)

#### Fortified Garrison
- **Cost**: 30 | **Move**: Static | **HP**: 6 | **Defense**: 6 | **Supply**: 5
- **Ability**: Provides strong defense and prevents supply cutoffs when garrisoned

## 🃏 Command Cards

Strategic one-use abilities that cost CP to play:

### Movement & Positioning
- **Rapid March** (2 CP): Move a unit +2 additional hexes
- **Emergency Redeploy** (1 CP): Save a unit from destruction by moving to reserves

### Combat Enhancement
- **Concentrated Fire** (3 CP): Ranged unit gains +3 attack for one shot
- **Hold the Line** (3 CP): Adjacent units gain +2 defense for the turn
- **Siege Overwatch** (4 CP): Siege engine fires twice in one activation

### Tactical Deployment
- **Reinforce** (4 CP): Deploy a Militia to any controlled Supply Camp
- **Ambush** (3 CP): Deploy a hidden Skirmisher from reserves

## 🗺️ Terrain Types

### Basic Terrain
- **Plain**: No modifiers (default terrain)
- **Forest**: +1 movement cost, +1 ranged defense, blocks line of sight
- **Hill**: +1 defense, +1 ranged attack for occupants
- **River**: +1 movement cost, prevents cavalry charges
- **Marsh**: +2 movement cost (Skirmishers ignore penalty)

### Strategic Terrain
- **City/Fort**: +3 defense, blocks supply cutoffs when garrisoned
- **Supply Camp**: Provides supply to adjacent friendly units

## 🎮 How to Play

### Setup Phase
1. **Army Building**: Each player builds a 100-point army from available units
2. **Map Setup**: Place terrain tiles on the hex battlefield
3. **Initial Deployment**: Players alternate deploying up to 5 units in their deployment zones
4. **Reserves**: Remaining units stay in reserves for later deployment

### Battle Phase
1. **Turn Start**: Gain 4 CP (max 6), reset unit activations
2. **Activations**: Use 3 activations to:
   - Move/attack with deployed units
   - Deploy units from reserves (costs 1 activation)
   - Play command cards (costs CP)
3. **Combat**: Resolve attacks using dice + stats system
4. **Supply Check**: Verify unit supply lines at turn end
5. **Morale**: Check units with 3+ morale tokens

### Victory
- Eliminate all enemy units (deployed and in reserves) to win
- Reserve units can be deployed throughout the battle
- Single decisive engagement determines the winner

## 🛠️ Technical Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Database**: Prisma ORM with PostgreSQL
- **UI Components**: Radix UI primitives
- **State Management**: React hooks with custom game logic
- **Deployment**: Vercel-ready configuration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL database (for persistence)

### Installation
```bash
# Clone the repository
git clone [repository-url]
cd towers-game

# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

### Environment Variables
Create a `.env.local` file:
```
DATABASE_URL="postgresql://username:password@localhost:5432/towers"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 🎯 Game Strategy Tips

### Army Building
- **Balance** is key: mix infantry, ranged, and support units
- **Commanders** provide crucial aura bonuses
- **Supply management** becomes critical in longer games
- **Elite units** are powerful but expensive - protect your investments

### Tactical Play
- **Control key terrain** like hills and supply camps
- **Maintain supply lines** to avoid combat penalties
- **Use Command Points wisely** - they're limited but powerful
- **Manage reserves strategically** - deploy them when and where needed most

### Advanced Tactics
- **Flanking** provides +2 attack bonus
- **Cavalry charges** are devastating but require positioning
- **Siege engines** excel at area denial and fortification breaking
- **Morale warfare** can break enemy formations without direct combat

## 📚 Additional Resources

- **Rules Reference**: Complete rulebook included in game
- **Unit Database**: Detailed stats and abilities for all units
- **Strategy Guides**: Tips for army building and tactical play
- **Community**: Join discussions about tactics and balance

## 🤝 Contributing

This is an open-source implementation of the TOWERS board game. Contributions are welcome for:
- Bug fixes and performance improvements
- UI/UX enhancements
- Additional unit types and abilities
- Balance adjustments
- New game modes and variants

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**TOWERS** - Where strategy meets tactics on the digital battlefield. Build your army, command your forces, and claim victory through superior tactics and strategic thinking.
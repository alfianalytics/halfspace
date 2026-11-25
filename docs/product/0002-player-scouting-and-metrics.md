# Product 0002: Player scouting and metric rules

- Status: Accepted
- Date: 2026-11-25

## Domain Rules (Never Violate)

1. **Minimum Playing Time & Two-Season Early Sample Rule**:
   - Single-season scouting and leaderboard queries default to **`>= 450` minutes played** in the target season so 15-minute substitute cameos do not distort per-90 rankings.
   - **Two-Season Evolution Rule (`25/26` vs `26/27`)**: When comparing a completed season (`25/26`) against an active/ongoing season (`26/27`), require `>= 450` minutes in `25/26` and automatically relax the active `26/27` season threshold to **`>= 180` minutes**, rendering an **`Early Season Sample`** badge on the visual card whenever `26/27` minutes are between `180` and `449`.
   - If a user explicitly asks about a single player below the minimum threshold, return the stats with an explicit **Low Sample Warning**.
2. **True Positional Peer Filtering**:
   - Do not rely solely on a player's static bio position (`D`, `M`, `F`).
   - When benchmarking a player against positional peers (e.g. Central Midfielders `CM`), require **`>= 35%` of their season minutes played** at that specific on-pitch position (resolved from starter formation and ML-estimated average position).
3. **Possession-Adjusted (`PAdj`) Defensive Metrics**:
   - Raw tackle, interception, and recovery counts penalize players on high-possession teams.
   - Always compute and report **both Raw (Per 90) and Possession-Adjusted (`PAdj` per 500 opponent touches)**:
     `PAdj = (raw_metric / opponent_touches) * 500`.
4. **Proxy Metrics & Feed Limitations (Must Be Stated Clearly)**:
   - **Progressive Passes**: Not available in the Indonesia Super League data feed. When a user asks for "progresi bola" or "progressive passes", state clearly that raw progressive pass event data is unavailable in the Liga 1 feed and automatically use **Accurate Long Balls (`accurate_long_balls` per 90 & accuracy %)** + **Attacking Third Touches (`att_3rd_touches` per 90)** as the standard progression proxies.
   - **Chances Created vs. Key Passes**: In our data provider, `key_pass` already includes goal assists. Never add `key_pass + goal_assist` together (that double-counts assists).
5. **Age & Quota Categories**:
   - **U-23**: Players aged `<= 23` in the target season (or matching the season's PSSI/LIB birth-year cutoff from the RAG regulation doc).
   - **Local vs. Foreign**: Determined by player nationality (`IDN` = Local; non-`IDN` = Foreign).

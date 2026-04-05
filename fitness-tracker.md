# 🏋️ Fitness Tracker

> Last Updated: April 5, 2026 — Baseline data populated

---

<!--
═══════════════════════════════════════════════════════════════
  AI AGENT INSTRUCTIONS — READ THIS BEFORE DOING ANYTHING ELSE
═══════════════════════════════════════════════════════════════

You are a personal fitness coach and document manager. This file
is the single source of truth for the user's fitness life. Your
job is to keep it accurate, up to date, and actionable.

── CORE RESPONSIBILITIES ──────────────────────────────────────

1. LOGGING
   - When the user tells you about a completed workout, add it
     to the Workout Log using the established entry format.
   - When the user shares weight, nutrition, or PR data, update
     the relevant section immediately.
   - Always update "Last Updated" at the top of the file after
     any change.

2. READING & UNDERSTANDING CONTEXT
   - Before making any recommendation, read:
       • Current Stats
       • The last 2–4 weeks of the Workout Log
       • The current Program (Workout Plans section)
       • Upcoming Events (to understand deadlines)
       • Current Goals (listed below in this header)
   - Never recommend something that conflicts with stated goals
     or upcoming event timelines.

3. RECOMMENDING TRAINING
   - Base recommendations on:
       (a) Current goals (see CURRENT GOALS below)
       (b) Recent training load — watch for overtraining signals
           (high frequency, low energy ratings, stalled PRs)
       (c) Recovery — flag if the user hasn't had a rest day in
           5+ days or energy levels have been consistently low
       (d) Event proximity — taper recommendations if an event
           is within 2 weeks
   - Always explain WHY you're recommending something.
   - Offer a specific next session plan when asked, not just
     general advice.

4. TRACKING PROGRESS
   - When a new PR is set, update the PR table and add a row to
     the PR History for that lift.
   - If strength or weight is trending in the wrong direction
     for 3+ weeks, proactively flag it.
   - Calculate and update Monthly Averages in the weight and
     nutrition sections at the start of each new month.

── CURRENT GOALS ──────────────────────────────────────────────

  Primary Goal:    Complete Hyrox event — April 29, 2026
  Secondary Goal:  Maintain strength & muscle mass during heavy
                   cardio phase. Fitbod overall strength score
                   currently 61 (Push 62 / Pull 60 / Legs 60).
                   Do not let scores drop below 58.
  Cardio Goal:     Improve Zone 2 pace. Zone 2 HR = ~120–130 bpm
                   (based on RHR 50, estimated max HR ~180).
                   Baseline Zone 2 pace currently unknown — log
                   first Zone 2 run to establish it.
  Long-Term Goal:  Body recomposition — reach 75kg at 14% body
                   fat. Currently 69kg / 15% body fat.
  Nutrition:       Slight caloric surplus to support lean weight
                   gain while managing Hyrox cardio load.
  Injuries:        None stated. Flag any recurring soreness.
  Training Tools:  Fitbod app for strength programming.

── CONTEXT FOR RECOMMENDATIONS ────────────────────────────────

  - Hyrox is 24 days away (as of April 5, 2026). Prioritise
    event readiness over all else until April 29.
  - Begin taper from April 22 (1 week out): reduce volume,
    keep intensity, prioritise sleep and nutrition.
  - After April 29: shift focus to lean bulk — muscle gain
    with gradual weight increase toward 75kg at 14% BF.
  - VO2 max is 43. Improving this improves Hyrox performance.
    Target 45+ post-event.
  - 5k and 10k pace currently unknown — ask user to record
    baseline time trial when possible.

── TONE & STYLE ───────────────────────────────────────────────

  - Be direct and specific. No filler or generic advice.
  - Use data from the log to back up observations.
  - Flag concerns honestly but constructively.
  - Keep document edits clean — preserve formatting conventions.

── EDITING RULES ──────────────────────────────────────────────

  - Never delete historical data. Archive old entries if needed.
  - Always use the existing table and entry formats.
  - Add new entries in reverse-chronological order (newest first)
    in the Workout Log.
  - When uncertain about data, ask rather than guess.

═══════════════════════════════════════════════════════════════
-->

---

## 📋 Table of Contents

1. [Composite Fitness Score](#composite-fitness-score)
2. [Current Stats](#current-stats)
3. [Workout Log](#workout-log)
4. [Workout Plans & Programs](#workout-plans--programs)
5. [Strength & PRs](#strength--prs)
6. [Body Weight Log](#body-weight-log)
7. [Calories & Nutrition](#calories--nutrition)
8. [Events & Competitions](#events--competitions)

---

## 🔢 Composite Fitness Score

> Updated weekly. Single number combining all key metrics. Scale: **0–30** Beginner · **30–50** Building · **50–65** Solid · **65–75** Strong · **75–85** High Performance · **85–100** Elite

### Score Log

| Date | **Score** | Cardio (35%) | Strength (30%) | Body Comp (20%) | Consistency (15%) | Notes |
|------|-----------|--------------|----------------|-----------------|-------------------|-------|
| Apr 5, 2026 | **49.7** | 15.4 | 12.5 | 11.2 | 10.7 | Baseline |

---

### How to Calculate

Each metric is normalised: `metric_score = (value − floor) / (ceiling − floor) × 100`, clamped 0–100. Lower-is-better metrics are inverted: `100 − score`.

#### Category 1 — Cardio (35%)

| Metric | Floor | Ceiling | Direction | Example: current value | Example: score |
|--------|-------|---------|-----------|----------------------|----------------|
| VO2 Max | 35 | 60 | Higher better | 43 | `(43−35)/(60−35)×100 = 32.0` |
| Zone 2 Pace (min/km) | 5.5 | 9.0 | Lower better | 8.0 est. | `100−((8.0−5.5)/(9.0−5.5)×100) = 28.6` |
| Resting HR (bpm) | 38 | 80 | Lower better | 50 | `100−((50−38)/(80−38)×100) = 71.4` |

`Cardio contribution = avg(VO2_score, Z2_score, RHR_score) / 100 × 35`

**Current: 15.4 / 35**

---

#### Category 2 — Strength (30%)

| Metric | Floor | Ceiling | Weight | Example: current value | Example: score |
|--------|-------|---------|--------|----------------------|----------------|
| Fitbod Overall | 40 | 90 | 30% | 61 | `(61−40)/(90−40)×100 = 42.0` |
| Bench Press (× BW) | 0.5× | 1.5× | 20% | 70kg ÷ 69kg = 1.01× | `(1.01−0.5)/(1.5−0.5)×100 = 51.4` |
| Deadlift (× BW) | 0.75× | 2.0× | 20% | 72.5kg ÷ 69kg = 1.05× | `(1.05−0.75)/(2.0−0.75)×100 = 24.1` |
| Leg Press (× BW) | 1.0× | 3.0× | 15% | 135kg ÷ 69kg = 1.96× | `(1.96−1.0)/(3.0−1.0)×100 = 47.8` |
| Pull-ups (reps) | 0 | 20 | 15% | 9 | `(9−0)/(20−0)×100 = 45.0` |

`Strength contribution = (42.0×0.30 + 51.4×0.20 + 24.1×0.20 + 47.8×0.15 + 45.0×0.15) / 100 × 30`

**Current: 12.5 / 30**

---

#### Category 3 — Body Composition (20%)

| Metric | Floor | Ceiling | Direction | Weight | Example: current value | Example: score |
|--------|-------|---------|-----------|--------|----------------------|----------------|
| Body Fat % | 10% | 25% | Lower better | 60% | 15% | `100−((15−10)/(25−10)×100) = 66.7` |
| Weight vs goal (kg) | 65kg | 75kg | Higher better | 40% | 69kg | `(69−65)/(75−65)×100 = 40.0` |

`Body Comp contribution = (66.7×0.60 + 40.0×0.40) / 100 × 20`

**Current: 11.2 / 20**

---

#### Category 4 — Consistency (15%)

| Metric | Floor | Ceiling | Weight | Example: current value | Example: score |
|--------|-------|---------|--------|----------------------|----------------|
| Sessions/week (avg) | 0 | 5 | 40% | 4 | `(4−0)/(5−0)×100 = 80.0` |
| Total sessions last 4 weeks | 0 | 20 | 30% | 16 | `(16−0)/(20−0)×100 = 80.0` |
| Cardio sessions/week | 0 | 4 | 30% | 2 | `(2−0)/(4−0)×100 = 50.0` |

`Consistency contribution = (80.0×0.40 + 80.0×0.30 + 50.0×0.30) / 100 × 15`

**Current: 10.7 / 15**

---

### Weekly Input Checklist

Collect these before each recalculation:

- VO2 max (from Apple Watch / Garmin — updates monthly)
- Zone 2 pace (avg pace from most recent run held at 120–130 bpm)
- Resting HR (morning average for the week)
- Fitbod overall strength score
- Best recent: bench (kg), deadlift (kg), leg press (kg), pull-ups (reps)
- Current bodyweight (kg) + body fat %
- Sessions per week (avg), total sessions last 4 weeks, cardio sessions per week

---

## 📊 Current Stats

| Metric | Value | Date |
|--------|-------|------|
| Weight | 69 kg | Apr 5, 2026 |
| Body Fat % | 15% | Apr 5, 2026 |
| VO2 Max | 43 | Apr 5, 2026 |
| Resting HR | 50 bpm | Apr 5, 2026 |
| 5k Pace | Unknown — run baseline ASAP | — |
| 10k Pace | Unknown — run baseline ASAP | — |

### Fitbod Strength Scores

| Category | Score | Date |
|----------|-------|------|
| Overall | 61 | Apr 5, 2026 |
| Push | 62 | Apr 5, 2026 |
| Pull | 60 | Apr 5, 2026 |
| Legs | 60 | Apr 5, 2026 |

---

## 🗓️ Workout Log

#### Apr 3, 2026 — Walking

**Duration:** 29 min | **Distance:** 4.0km

---

#### Mar 31, 2026 — Running

**Duration:** ~25 min | **Distance:** ~4.1km (two runs combined)

---

#### Mar 30, 2026 — Upper Body (Push + Pull)

| Exercise | Sets | Reps | Weight | Notes |
|----------|------|------|--------|-------|
| Barbell Bench Press | 3 | 7/6/5 | 60kg | Slight drop from Feb peak |
| Barbell Shoulder Press | 4 | 7/7/6/5 | 32.5kg | PR weight |
| Cable Row | 3 | 15/15/12 | 45kg | |
| Pull-ups | 3 | 6/6/6 | BW | |
| Dips | 4 | 9/9/9/9 | BW | |
| Barbell Curl | 3 | 7/5/3 | 22.5kg | Fatigued by end |

---

#### Mar 24, 2026 — Upper Body (Push + Pull)

| Exercise | Sets | Reps | Weight | Notes |
|----------|------|------|--------|-------|
| Barbell Bench Press | 3 | 9/9/8 | 60kg | Solid session |
| Pull-ups | 3 | 6/6/6 | BW | |
| Dips | 4 | 10/10/10/10 | BW | |
| Cable Lateral Raise | 3 | 5/5/5 | 9kg (each) | |

---

#### Mar 12, 2026 — Upper Body (Push + Pull)

| Exercise | Sets | Reps | Weight | Notes |
|----------|------|------|--------|-------|
| Barbell Bench Press | 4 | 8/8/6/7 | 45/55/65/65kg | Good top sets at 65kg |
| Barbell Shoulder Press | 3 | 8/7/7 | 32.5kg | |
| Pull-ups | 5 | 5/5/5/5/5 | BW | |
| Dips | 4 | 10/10/10/10 | BW | |
| Hammer Curls | 3 | 12/12/12 | 10kg each | |

---

#### Mar 21, 2026 — Stationary Bike

**Duration:** 35 min | **Avg HR:** 125 bpm | **Calories:** 276

---

#### Mar 18, 2026 — HIIT

**Duration:** 66 min | **Avg HR:** 151 bpm | **Max HR:** 175 bpm | **Calories:** 645

---

#### Mar 14, 2026 — HIIT

**Duration:** 59 min | **Avg HR:** 165 bpm | **Max HR:** 180 bpm | **Calories:** 652 | High intensity

---

#### Mar 10, 2026 — Lunch Run

**Duration:** 29 min | **Distance:** 5.19km | **Avg Pace:** 5:39/km | **Avg HR:** 169 bpm | **Max HR:** 184 bpm
**Notes:** Zone 4 effort — well above Zone 2 target of 120–130 bpm

---

#### Mar 9, 2026 — Upper Body + Wall Balls

| Exercise | Sets | Reps | Weight | Notes |
|----------|------|------|--------|-------|
| Barbell Bench Press | 3 | 9/9/9 | 57.5kg | |
| Barbell Shoulder Press | 2 | 10/10 | 30kg | |
| Pull-ups | 4 | 5/5/5/5 | BW | |
| Dips | 4 | 11/11/11/11 | BW | |
| Wall Ball | 10 | 10×10 | 4kg | 100 reps total — good Hyrox practice |

---

#### Mar 5, 2026 — Legs ⚠️ *Last leg session — 31 days ago*

| Exercise | Sets | Reps | Weight | Notes |
|----------|------|------|--------|-------|
| Leg Press | 4 | 10/10/10/10 | 120kg | |
| Romanian Deadlift | 3 | 9/9/9 | 52.5kg | PR |
| Leg Extension | 4 | 5/5/5/5 | 50kg | |
| Barbell Hip Thrust | 3 | 8/8/8 | 55kg | PR |

---

#### Mar 3, 2026 — Lunch Run

**Duration:** 27 min | **Distance:** 4.0km | **Pace:** 6:38/km | **Avg HR:** 159 | **Max HR:** 170 | **Calories:** 305

---

#### Feb 28, 2026 — Morning Run

**Duration:** 41 min | **Distance:** 6.5km | **Pace:** 6:17/km | **Avg HR:** 152 | **Max HR:** 176 | **Calories:** 472
> HR just above Zone 2 ceiling — borderline effort

---

#### Feb 25, 2026 — Afternoon Run

**Duration:** 34 min | **Distance:** 5.0km | **Pace:** 6:51/km | **Avg HR:** 148 | **Max HR:** 163 | **Calories:** 341
> ✅ Closest to Zone 2 in recent history — best pace baseline we have

---

#### Dec 27, 2025 — 10km Long Run (Runna Plan)

**Duration:** 56 min | **Distance:** 10.04km | **Pace:** 5:34/km | **Avg HR:** 166 | **Max HR:** 190 | **Calories:** 695
> Noted as "conversational pace" but HR elevated — likely harder than intended

---

#### Dec 16, 2025 — Lunch Run

**Duration:** 49 min | **Distance:** 6.6km | **Pace:** 7:25/km | **Avg HR:** 152 | **Max HR:** 165 | **Calories:** 520

## 📅 Workout Plans & Programs

### Current Program — Hyrox Prep (Apr 5 – Apr 28, 2026)

**Program Name:** Hyrox Peak & Taper  
**Goal:** Event readiness for Hyrox on April 29. Maintain strength scores. Improve Zone 2 pace.  
**Duration:** 3.5 weeks  
**Days per Week:** 5 active, 2 rest/recovery  
**Start Date:** April 5, 2026  
**Taper Start:** April 22, 2026  

---

#### Phase 1 — Build (Apr 5–14) · 10 days

Focus: Aerobic base, strength maintenance via Fitbod, leg priority.

| Day | Date | Focus | Session |
|-----|------|-------|---------|
| Mon | Apr 7 | Strength — Push (Fitbod) | Bench, OHP, dips. Keep score ≥62 |
| Tue | Apr 8 | Zone 2 Run | 30–40 min at 120–130 bpm. Log pace — this is your baseline |
| Wed | Apr 9 | Strength — Legs (Fitbod) | Squats, lunges, leg press, hip hinge. Score ≥60 |
| Thu | Apr 10 | Strength — Pull (Fitbod) | Rows, pull-ups, curls |
| Fri | Apr 11 | Hyrox Simulation Run | 2–3km at race pace to feel the effort level. No stations needed |
| Sat | Apr 12 | Longer Zone 2 Run | 45–50 min. HR control, not pace |
| Sun | Apr 13 | Rest | Full recovery |
| Mon | Apr 14 | Strength — Legs (Fitbod) | Second leg session — focus on posterior chain (RDLs, hamstring curls) |

---

#### Phase 2 — Sharpen (Apr 15–21) · 7 days

Focus: Race-specific intensity, one full simulation, leg strength maintained.

| Day | Date | Focus | Session |
|-----|------|-------|---------|
| Tue | Apr 15 | Strength — Legs (Fitbod) | Heavy — squats and sled-pattern movements. Protect score ≥60 |
| Wed | Apr 16 | Zone 2 Run | 35–40 min. Compare pace to Apr 8 baseline |
| Thu | Apr 17 | Strength — Full Body (Fitbod) | Moderate weight, higher reps (10–12). Avoid failure |
| Fri | Apr 18 | Hyrox Full Simulation | Run 1km + all 8 stations in sequence at 70% effort. Log total time |
| Sat | Apr 19 | Tempo Run | 20–25 min at ~75–80% max HR |
| Sun | Apr 20 | Rest | Full recovery |
| Mon | Apr 21 | Strength — Push/Pull (Fitbod) | Upper body only — moderate load, not to failure |

---

#### Phase 3 — Taper (Apr 22–28) · 7 days

Focus: Arrive fresh. Cut volume ~30–40%, keep intensity. No new stimulus.

| Day | Date | Focus | Session |
|-----|------|-------|---------|
| Tue | Apr 22 | Short Run | 20 min easy Zone 2. Shake out the legs |
| Wed | Apr 23 | Light Hyrox Run-through | Walk through stations at 50% effort. Mental rehearsal |
| Thu | Apr 24 | Rest | Full recovery |
| Fri | Apr 25 | Short Activation | 15 min: light sled, 10 wall balls, 200m ski erg. Just activation |
| Sat | Apr 26 | Rest | Walk, stretch, eat well, sleep early |
| Sun | Apr 27 | Rest | Final prep — kit, nutrition plan, travel if needed |
| Mon | Apr 28 | Rest or 10 min jog | Optional very light shakeout. No effort |
| **Tue** | **Apr 29** | **🏁 HYROX** | **Race day. Eat 2–3 hrs before. Warm up 15 min.** |

---

#### Hyrox Station Reference

| Station | Rx Distance / Volume | Notes |
|---------|---------------------|-------|
| Ski Erg | 1,000m | Pace conservatively — early in race |
| Sled Push | 50m | Heavy — drive from hips |
| Sled Pull | 50m | Rope hand-over-hand |
| Burpee Broad Jumps | 80m | Sustainable rhythm, don't blow up |
| Rowing | 1,000m | Steady 500m split — don't sprint |
| Farmer's Carry | 200m | Grip and posture |
| Sandbag Lunges | 100m | Core tight, controlled steps |
| Wall Balls | 100 reps | Biggest energy cost — save something for this |

> Between each station: 1km run. 8 stations = 8km total running.

---

#### Zone 2 Training Log

> Zone 2 HR target: **120–130 bpm** (based on RHR 50, max HR ~190 from Strava)
> Estimated Zone 2 pace: **~7:30–8:00/km** — will feel very easy, that's correct.
> ⚠️ Recent runs have averaged 148–169 bpm (Zone 3–4). Tuesday needs to be significantly slower than your current easy pace.

| Date | Duration | Distance | Avg HR | Avg Pace | Notes |
|------|----------|----------|--------|----------|-------|
| Dec 16, 2025 | 49 min | 6.6km | 152 bpm | 7:25/km | Above Z2 but closest early on |
| Feb 25, 2026 | 34 min | 5.0km | 148 bpm | 6:51/km | Best Z2 approximation — slightly above target |
| Feb 28, 2026 | 41 min | 6.5km | 152 bpm | 6:17/km | Zone 3 — faster pace, HR crept up |
| Mar 3, 2026 | 27 min | 4.0km | 159 bpm | 6:38/km | Zone 3 |
| Mar 10, 2026 | 29 min | 5.19km | 169 bpm | 5:37/km | Zone 4 — hard effort |
| Apr 8, 2026 | TBD | TBD | TBD | TBD | **First true Z2 baseline — keep HR 120–130 bpm** |

> 📌 True Z2 pace will feel uncomfortably slow. Use your watch to enforce the HR ceiling, not perceived effort.

#### Recent Run Log (from Strava)

| Date | Distance | Time | Avg Pace | Avg HR | Effort |
|------|----------|------|----------|--------|--------|
| Mar 10, 2026 | 5.19km | 29 min | 5:39/km | 169 bpm | Zone 4 — hard |
| Mar 3, 2026 | 4.0km | 26 min | 6:38/km | 159 bpm | Zone 3 |
| Feb 28, 2026 | 6.5km | 41 min | 6:17/km | 152 bpm | Zone 3 |
| Feb 25, 2026 | 5.0km | 34 min | 6:54/km | 148 bpm | Zone 3 |
| Dec 27, 2025 | 10.04km | 55 min | 5:32/km | 166 bpm | Zone 4 — labelled "conversational" |

---

### Past Programs

| Program | Goal | Start | End | Result |
|---------|------|-------|-----|--------|

---

## 💪 Strength & PRs

### Personal Records

| Lift | 1RM / Best | Date Set | Notes |
|------|-----------|----------|-------|
| Barbell Bench Press | 70kg × 5 | Oct 14 & Oct 8, 2025 | Best working weight |
| Barbell Shoulder Press | 32.5kg × 7 | Feb 23 & Mar 30, 2026 | |
| Deadlift | 72.5kg × 8 | Feb 20, 2026 | |
| Romanian Deadlift | 52.5kg × 9 | Mar 5, 2026 | |
| Leg Press | 135kg × 6 | Feb 20, 2026 | |
| Back Squat | 65kg × 4-6 | Nov 4, 2026 | Best working weight |
| Barbell Hip Thrust | 55kg × 8 | Mar 5, 2026 | |
| Pull-ups | 9 reps BW | Jan 31 & Feb 4, 2026 | |
| Lat Pulldown | 60kg × 5–10 | Multiple sessions | |
| Cable Row | 50kg × 8–15 | Multiple sessions | |
| Seated Leg Curl | 57.5kg × 12 | Feb 24, 2026 | |

### PR History

#### Barbell Bench Press

| Date | Weight / Reps | Notes |
|------|---------------|-------|
| Sep 2025 | 55kg × 5–6 | Starting point |
| Oct 8, 2025 | 70kg × 8 | First time at 70kg |
| Oct 14, 2025 | 70kg × 5×5 | Consistent at 70kg |
| Oct 27, 2025 | 65kg × 7 | |
| Feb 4, 2026 | 57.5kg × 11 | Higher volume |
| Mar 12, 2026 | 65kg × 6–7 | |
| Mar 30, 2026 | 60kg × 5–7 | Slight drop — cardio phase impact |---

## ⚖️ Body Weight Log

**Goal Weight:** 75 kg (long-term, post-Hyrox lean bulk)
**Starting Weight:** 69 kg
**Starting Date:** April 5, 2026

| Date | Weight | Change | Notes |
|------|--------|--------|-------|
| Apr 5, 2026 | 69 kg | — | Baseline |

### Monthly Averages

| Month | Avg Weight | Notes |
|-------|-----------|-------|

---

## 🥗 Calories & Nutrition

### Daily Targets

> Goal: slight caloric surplus (~200–300 kcal above maintenance) to support lean weight gain during Hyrox prep. High protein to protect muscle. Carb-timed around training for performance and recovery.

| Metric | Current | Target |
|--------|---------|--------|
| Calories | ~1,945 kcal | 2,300 kcal |
| Protein | ~152 g | 165+ g |
| Carbs | — | ~250 g |
| Fat | — | ~65 g |
| Water | — | 3 L |

---

### Optimised Daily Food Stack

| Meal | Food | Calories | Protein | Notes |
|------|------|----------|---------|-------|
| Breakfast | Morning smoothie (see below) | ~590 kcal | ~52 g | |
| Lunch | PrepKitchen meal | ~700 kcal | ~53 g | |
| Dinner | PrepKitchen meal | ~700 kcal | ~53 g | |
| Snack | Protein bar (post-training) | ~210 kcal | ~20 g | Target 20g+ protein, <10g sugar |
| **Daily Total** | | **~2,200 kcal** | **~178 g** | **On target** |

#### Morning Smoothie

| Ingredient | Amount | Calories | Protein |
|------------|--------|----------|---------|
| 5% Greek yogurt | 225g | ~190 kcal | ~20 g |
| Rolled oats (dry) | 50g | ~190 kcal | ~6 g |
| Banana | 1 medium | ~90 kcal | ~1 g |
| Form protein shake | 1 serving | ~120 kcal | ~25 g |
| Creatine | 5g | — | — |
| **Total** | | **~590 kcal** | **~52 g** | |

### Pre & Post Training Nutrition (on session days)

| Timing | Recommendation |
|--------|---------------|
| 60–90 min before | Oats + yogurt breakfast, or banana + handful of nuts |
| During (>60 min sessions) | Water + electrolytes if sweating heavily |
| Within 30 min after | Protein shake + banana, or PrepKitchen meal |

---

### Weekly Nutrition Summary

| Week of | Avg Calories | Avg Protein | Notes |
|---------|-------------|-------------|-------|
| Apr 5, 2026 | ~1,945 | ~152 g | Baseline — diet overhaul starts this week |

---

## 🏁 Events & Competitions

### Upcoming Events

| Date | Event | Location | Category | Goal | Registered? |
|------|-------|----------|----------|------|-------------|
| Apr 29, 2026 | Hyrox | — | — | Finish strong, baseline time | ✅ |

### Hyrox Prep Notes

#### Hyrox — April 29, 2026

**Goal:** Complete the event and establish a baseline finish time for future improvement.  
**Training Focus:** Running endurance + functional strength (sled, wall balls, rowing, ski erg). Maintain Fitbod strength scores above 58.  
**Taper:** Begin April 22 — reduce volume ~30%, keep intensity, prioritise sleep and nutrition.  
**Gear Needed:** Running shoes, gym kit, — *(add any specifics)*  
**Notes:** VO2 max currently 43. 5k/10k baseline pace unknown — run a time trial this week.

### Past Events

| Date | Event | Location | Result / Time | Notes |
|------|-------|----------|---------------|-------|

---

## 📝 Notes & Reflections



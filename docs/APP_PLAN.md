# Extris as a phone app: the plan

The big picture for turning the web game into a freemium Android app (then iOS), written
October 2026. Each phase below gets walked through step by step later; this file is the map.

## The short version

- **Wrap the existing game with [Capacitor](https://capacitorjs.com).** It puts the current
  `index.html` + `src/` + `shapes/` inside a native Android/iOS shell (a full-screen WebView)
  with almost no changes to the game. One codebase keeps serving Netlify, Android and iOS.
- **Let the stores and RevenueCat handle all money.** Google Play / the App Store take payment
  and card details; [RevenueCat](https://www.revenuecat.com) (free under $2.5k/month revenue)
  sits on top of both so the game asks one question: "does this player own God mode?".
  You never see a card number, an email address or a password.
- **Keep every player's data on their phone.** Achievements, settings, the tutorial-done flag
  and the powerup inventory stay on the device (as now), moved from `localStorage` to
  Capacitor's Preferences store, which the OS backs up and doesn't clear. Paid unlocks are
  restored from the store, so they survive a new phone.
- **No server for v1.** You're right that the leaderboard is the only feature that needs one,
  so it waits for v1.1 (a single small Supabase table).
- **No ads for v1** (reasons below). It's the one monetisation path that would drag sensitive
  data handling, consent pop-ups and privacy paperwork into an otherwise clean app.

## What the repo looks like from an app's point of view

Good news first — this is about as wrap-friendly as a web game gets:

- Plain ES modules, no bundler, no external scripts or CDNs, fonts are local: the folder can be
  copied into the app as it is and works offline.
- Saving already goes through one place (`src/util.js` store helpers and the
  `localStorageAdapter` in `src/achievements.js`), so moving it to native storage is a
  small change, not a hunt.
- Touch controls and phone layout already work.

Things the app version needs that the website doesn't:

| Area | What's needed |
|---|---|
| Storage | `localStorage` in a WebView can be wiped by the OS. Swap the store helpers to `@capacitor/preferences` on native (keep `localStorage` on the web). |
| Android back button | Must do something sensible (pause / go back a menu / leave from home), via `@capacitor/app`. Play reviewers notice. |
| Backgrounding | Pause the game and sound when the app goes to the background. Turbo zen currently keeps running when hidden (`pauseWhenHidden: false`) — fine on a desktop tab, a battery drain in an app. |
| Screen | Portrait lock, full screen, notch / gesture-bar safe areas (Capacitor 8's SystemBars handles edge-to-edge). |
| Startup | `shapes/main_shapes.js` is ~7.5 MB of JS to parse at boot; measure on a cheap Android phone. The one-line-per-colour reformat in `LATER.md` (to about a third) becomes worth doing. |
| What ships | Only the game: not `block_designer.html`, `serve.py`, `tests/`, and dev/debug modes switched off in the store build. |
| Icon & splash | Generated from one source image with `@capacitor/assets`. |
| Nice to have | Haptics on line clears (`@capacitor/haptics`); keep-awake while Turbo zen is the idle screen. |

## Why Capacitor (and not the alternatives)

- **Capacitor (recommended):** the standard tool for "I have a working web app, put it in the
  stores". Current major version is 8. Mature plugins for exactly what's needed here
  (purchases, storage, back button, haptics). Same project produces the iOS app later.
- **Trusted Web Activity / Bubblewrap (Android only):** shows the Netlify site in Chrome inside
  an app. Lighter, but in-app purchases need the Digital Goods API, and there's no iOS
  equivalent, so you'd build the Apple side a second, different way.
- **Rewriting in Unity / Godot / native:** throws away a working game. No.

## Monetisation: recommendations

### Mode unlocks (non-consumable, bought once, restorable)

| Mode | Recommendation |
|---|---|
| Classic | Free. |
| Zen | Free. |
| Turbo zen | Free (agree: it's the showpiece, the idle screen and the trailer). |
| **God mode** | **Paid.** The clearest "skip to the endgame" purchase. Suggest ~£2.99. |
| Extreme | Your call. Leaning free: it's "the original", it's frustrating rather than tempting, and hard-mode players are the ones who'll care about a leaderboard later. Paywalling frustration converts badly. |
| Custom mode (future) | Good second paid mode; pairs with God mode in an "all modes" bundle later. |

### Powerup packs (consumables)

- **Make paid packs deterministic, not random.** Both Google Play and Apple require published
  odds for any paid randomised item ("loot boxes"), and some countries (e.g. Belgium) restrict
  them outright. "5 × Gravitizer X" or "a fixed bundle of 6 helpers" avoids all of it.
  Random *free* drops (tutorial gift, daily gift) are fine.
- **The inventory lives on the device.** When RevenueCat confirms a purchase, the game adds the
  powerups to a local count; deploying one subtracts it. Works offline, no server.
  Trade-off: consumables can't be "restored", so a wipe-and-reinstall without a backup loses
  unspent powerups (normal for casual games; Android Auto Backup and iCloud backup cover most
  cases). If that ever matters, RevenueCat's *virtual currencies* can hold the balances on their
  side instead (one "currency" per powerup type, max 100) at the cost of needing a connection to
  spend one.
- **The leaderboard question:** bought powerups make scores pay-to-win. For a silly
  leaderboard that's fine; just decide whether runs that used bought powerups are marked.

### Ads: recommend none for v1

- A banner on the home screen of a game with no feed and short sessions earns very little
  (pennies per thousand views).
- Adding AdMob means: the GDPR/UK consent pop-up on first launch, Apple's tracking-permission
  prompt, declaring advertising-ID collection on the Play Data safety form, a "Contains ads" label,
  and a privacy policy that's about data sharing rather than "we collect nothing".
- It also puts a banner over Turbo zen, the best thing on the screen.
- Easy to add later if the numbers argue for it; hard to take away once players have paid to
  remove it.

### "Your piece in the game" (~£100)

- **Sell it on your website, not in the app.** If it's bought inside the app it must go
  through the store's in-app purchase (and their cut), plus collecting a design brief in-app is
  awkward. A Stripe Payment Link (or Ko-fi commissions) on the Netlify site handles payment;
  Stripe holds the card data, you get an email with the order.
- Don't advertise it inside the iOS app at first (Apple's rules about pointing users to outside
  purchases vary by country); market it on your site and socials. Android is more relaxed.
- Terms to write down: what you decline (trademarks, characters from other games/films, real
  people, anything offensive), full refund if declined, turnaround (one month), no design
  feedback, removal on request without refund, limited number of slots.
- "Common for the buyer, rare for everyone else" needs the game to know who the buyer is.
  Simplest route with no codes and no accounts: a free **favourite piece** setting anyone can use
  (pick any piece you've seen; it turns up more often for you). The commissioner just picks theirs.

### Promo codes for free stuff

- Use the **stores' own codes**, which RevenueCat picks up automatically:
  Google Play promo codes (500 per quarter across one-time products) and Apple offer codes
  (now cover consumables and non-consumables; Apple retired the old IAP promo codes in 2026).
- Avoid home-made codes that unlock **paid** things: Apple's guideline 3.1.1 forbids unlocking
  paid content through your own mechanisms (license keys, QR codes...). Home-made codes for free
  fun (an easter-egg piece, a skin) are fine.

## Features

| Feature | Where it lives | Notes |
|---|---|---|
| First-play tutorial, changed behaviour after it, powerup intros | Device | A `tutorialDone` flag in the store. The tutorial ends by gifting a free starter bundle and showing where the shop is. |
| Achievements & progress | Device | Already built; just the storage swap. |
| Purchases & restore | Store + RevenueCat | Apple requires a visible "Restore purchases" button. |
| Promo codes | Store | Redeemed in the Play Store / App Store, not in the game. |
| Leaderboard | Small server (v1.1) | See below. |

### Leaderboard (v1.1)

Two routes:

1. **Google Play Games / Apple Game Center leaderboards** — free and hosted by the platforms, but
   split per platform, use the players' gamer tags, and look like every other game's.
2. **A Supabase table (recommended, matches your style):** `initials (3 letters), score, mode,
   date`, written through one database function that checks the values and rate-limits.
   Cross-platform, arcade-style, and it holds nothing personal. Cheating is possible but the
   board is silly by design. (Supabase's free tier pauses idle projects; a live game's traffic or
   the $25/month plan avoids that.)

## Accounts, money and paperwork

| Item | Cost | Notes |
|---|---|---|
| Google Play developer account | $25 once | Identity verification takes days — start early. |
| Apple Developer Program | $99 / year | Only needed at the iOS phase. |
| RevenueCat | Free under $2.5k/month revenue, then 1% | |
| Store fees | 15% | Google: 15% on your first $1M/year automatically. Apple: 15% after joining the Small Business Program (apply — it isn't automatic). |
| Mac for iOS builds | £0 if you own one | Otherwise a cloud build service (Codemagic, Capgo, Capawesome have Mac builders). |
| Netlify / Supabase | What you pay now | Privacy policy + terms pages go on the Netlify site. |

Things to know before signing up:

- **New personal Play accounts must run a closed test with 12+ testers for 14 days in a row**
  before they can publish to production. Line those testers up early (friends, family, a
  Discord). Organisation accounts are exempt but need a registered company and a D-U-N-S number.
- **Your name and contact details become public.** Both stores show the seller's legal name, and
  selling in the EU (Digital Services Act "trader" status) or monetising on Play means showing an
  address, email and phone number on the listing. A business address service avoids publishing
  your home address.
- **Store forms:** privacy policy URL, Play Data safety form, content rating questionnaire
  (IARC), target audience (say 13+ / not for children, to stay out of the much stricter Families
  rules).
- **Tax:** store income is self-employment income in the UK; the stores pay out without
  deducting UK tax. Worth a word with an accountant once money arrives (not advice, just a flag).
- **The name.** The Tetris Company enforces its trademark and trade dress hard, and the stores act
  on their complaints (a free iPhone clone called "Tris" was pulled in 2008; *Tetris Holding v.
  Xio*, 2012, went against a lookalike). Extris is already well clear on the game itself (14×24
  board, ~1,000 non-tetromino pieces, powerups), but a name ending in "-tris" is the obvious
  thing for them to object to. Decide before the store listing exists — renaming afterwards
  costs downloads and reviews. Never use "Tetris" in the listing or keywords.

## The phases

Rough order; each is a "walk me through it" session later.

**Phase 0 — decisions and accounts (start now, it has waiting time in it)**
- Answer the open questions below.
- Create the Google Play developer account and payments profile; start identity verification.
- Recruit 12+ Android testers with Google accounts.

**Phase 1 — the game running on your phone (no money yet)**
- Install Node and Android Studio; add `package.json` and Capacitor to this repo.
- A small copy step that assembles the shippable files into `www/` (game only).
- `src/platform.js`: one place that knows "web or app" — storage, back button,
  pause on background, haptics.
- Portrait lock, safe areas, icon, splash, app id (e.g. `com.yourname.extris`, permanent).
- Run on your own Android phone over USB; measure startup and Turbo zen frame rate on a cheap phone.

**Phase 2 — app-only gameplay features**
- First-play tutorial and starter bundle, powerup inventory + "deploy" button in game,
  shop screen, God-mode lock screen (all working with a fake "store" first so it can be tested
  without paying).

**Phase 3 — real purchases on Android**
- Create the products in Play Console (`god_mode`, `pack_...`), connect Play to RevenueCat, add
  `@revenuecat/purchases-capacitor`, hook the shop to it, test with Play's licence testers
  (test purchases cost nothing).

**Phase 4 — release on Android**
- Privacy policy, store listing (screenshots; Turbo zen makes a great promo video), Data safety,
  content rating.
- Internal test → closed test (12 testers, 14 days) → production.

**Phase 5 — iOS**
- Apple Developer Program, a Mac or cloud Mac builds, the same products in App Store Connect,
  RevenueCat's iOS side, TestFlight, App Review. Most of the game code is already done by then.

**Phase 6 — after launch (pick and choose)**
- Leaderboard (Supabase), piece commissions on the website, store promo codes, Custom mode,
  Play Games / Game Center achievements, ads only if ever needed.

## Open questions

1. What computer do you develop on (Windows / Mac / Linux)? Do you have, or have access to, a Mac?
2. Personal or organisation (company) developer account?
3. What happens to the free website once the app exists — stays the full game, becomes a demo
   (e.g. Classic + Turbo zen with a "get the app" link), or both?
4. Extreme: free or paid? Ads: agree to leave them out of v1?
5. The name: keep "Extris" or take the chance to pick one without "-tris"?

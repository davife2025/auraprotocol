# Aura Protocol — UI Update Notes

## What's in this zip

Drop these files into your Next.js project, respecting the folder structure.

```
aura-ui/
├── tailwind.config.ts          ← NEW — defines aura colour palette + animations
├── src/
│   ├── app/
│   │   ├── globals.css         ← UPDATED — full design system, aura-* classes
│   │   ├── layout.tsx          ← UPDATED — Inter variable font wired up
│   │   ├── page.tsx            ← UPDATED — polished home page
│   │   ├── login/page.tsx      ← UPDATED — dark login, better error states
│   │   ├── dashboard/page.tsx  ← unchanged (server component redirect)
│   │   ├── onboarding/page.tsx ← UPDATED — tag editing, better step UI
│   │   ├── rooms/page.tsx      ← UPDATED — stellar niche colour, aura-* classes
│   │   ├── settings/page.tsx   ← UPDATED — aura-* classes, better UX
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── dashboard/DashboardShell.tsx  ← UPDATED — aura-* classes throughout
│   │   └── ui/Providers.tsx             ← unchanged (already correct)
│   └── lib/
│       ├── auth.ts     ← unchanged
│       ├── prisma.ts   ← unchanged
│       └── stellar.ts  ← unchanged
```

## Files to DELETE from your project

These were leftover from the old Monad/EVM implementation and are no longer used:

- `src/lib/wagmi.ts`   — Monad wagmi config (replaced by Stellar)
- `src/lib/wallet.ts`  — viem verifyMessage (replaced by stellar SDK in auth.ts)

## Key fixes applied

1. **`tailwind.config.ts`** — The `aura-*` Tailwind colour classes (aura-50 through aura-900)
   were never defined, causing all buttons, badges, and accents to render unstyled.
   Now defined as a rich violet-purple ramp.

2. **`globals.css`** — Added:
   - `animate-pulse-slow` (was missing, caused console errors)
   - `.aura-btn-primary`, `.aura-btn-ghost`, `.aura-btn-danger`
   - `.aura-input`, `.aura-stat`, `.aura-skeleton`, `.aura-spinner`
   - `.aura-card-hover`, `.aura-badge-purple`, `.aura-badge-gray`
   - `.text-aura-gradient`, `.scrollbar-hide`, `.line-clamp-*`
   - Proper focus ring system using `*:focus-visible`

3. **All pages** — Replaced raw Tailwind strings with the new component classes
   for consistency and easier future theming.

## Colour palette

The `aura` colour is a rich violet-purple:

| Token      | Hex       |
|------------|-----------|
| aura-50    | #F5F3FF   |
| aura-100   | #EDE9FE   |
| aura-200   | #DDD6FE   |
| aura-300   | #C4B5FD   |
| aura-400   | #A78BFA   |
| aura-500   | #8B5CF6   |
| aura-600   | #7C3AED   | ← primary button colour
| aura-700   | #6D28D9   | ← hover state
| aura-800   | #5B21B6   |
| aura-900   | #4C1D95   |

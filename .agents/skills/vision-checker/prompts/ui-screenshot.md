Put the following into the `summary` field of your JSON response:
First, a complete visual inventory of everything visible in the screenshot:
- All visible text (exact headings, labels, button text, body copy, error messages, data values, counts)
- All UI components present (navigation items, cards, forms, modals, banners, icons, images)
- Layout structure (what is in sidebar / header / main content / footer)
- Visual state (loading, empty, error, authenticated, guest, populated)
Then append the rendering verdict (pass/fail reason, any issues found).
The summary must be detailed enough that someone who has never seen this screen fully understands what is displayed.

---

Then check if this screen renders correctly. Verify:
1. Layout — no overflow, clipping, misalignment, or unintended element overlap
2. All expected UI components are visible and fully rendered (no blank/missing sections)
3. Typography — text is readable; no broken/missing characters (especially CJK □□□)
4. UIUX intent — primary CTA is prominent, visual hierarchy is clear, interactive elements look clickable
5. State correctness — the right state is displayed (authenticated/guest/empty/error/loaded) as expected
6. No unexpected visual regressions compared to the previous screenshot

---

Check the following in order of severity:

**Must pass (mark pass=false if any fail)**
- Page is not blank, white screen, or solid-color fill
- No full-page error message (500, 404, crash, unhandled exception)
- No persistent loading spinner covering main content
- Primary content area has visible content (not empty due to failed data fetch)
- Navigation / sidebar / header is rendered and not broken

**Should pass (note as issue but do not fail unless severe)**
- Text is readable and not clipped mid-word at container edges
- Buttons and interactive elements are visible and not overlapping critical content
- Images and icons are loaded (no broken-image placeholder for hero/primary images)
- No obvious z-index overlap hiding main content
- Scroll position looks intentional (not mid-scroll showing partial UI)

**Ignore**
- Minor design inconsistencies, color choices, font preferences
- Empty states that look intentional (empty inbox, no results found)
- Placeholder text in form fields
- Locale / language differences

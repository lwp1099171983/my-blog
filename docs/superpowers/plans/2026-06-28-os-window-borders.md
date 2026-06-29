# OS Window Borders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `prototype4.html` so windows and primary controls use a unified retro OS border system with a dark outer stroke and 3D highlight/shadow edges.

**Architecture:** This is a single-file visual prototype change. Add OS border tokens in `:root`, then replace the existing single-color border treatment on windows and controls with raised/inset 3D borders using `border-color` and `box-shadow`. No JavaScript behavior changes are required.

**Tech Stack:** Static HTML, CSS custom properties, no new libraries, no build step.

## Global Constraints

- Must fully read `./docs/prd.md`, `./docs/architecture.md`, and `./docs/tasks.md` before execution; if `docs/tasks.md` does not exist, note that and continue only for this isolated prototype edit.
- Visual layer does not require automated tests.
- Do not introduce third-party libraries.
- Keep changes scoped to `prototype4.html`.
- Reply in Chinese.

---

## File Structure

- Modify: `prototype4.html`
  - CSS token section in `:root`: add retro OS border variables.
  - `.window`: replace transparent gradient border with darkest-purple hard edge and 3D inner border.
  - `.titlebar`, `.titlebar-btn`, `.taskbar-start`, `.taskbar-tab`, `.taskbar-clock`, `.pixel-btn`, `.pixel-input`, `.pixel-tag`, `.pixel-card`, `.post-item`, `.hit-counter`: align border colors with raised/inset OS treatment.
  - JavaScript and HTML structure remain unchanged.

### Task 1: Add OS Border Tokens And Window Frame

**Files:**
- Modify: `prototype4.html`

**Interfaces:**
- Consumes: existing CSS custom properties in `:root`.
- Produces: `--os-border-dark`, `--os-highlight`, `--os-shadow`, `--os-border-raised`, `--os-border-inset`, `--os-window-frame-shadow` CSS variables used by later CSS rules.

- [ ] **Step 1: Add border variables in `:root` after `--border-color`**

Add this block immediately after the existing `--border-color:    var(--c-purple-500);` line:

```css
  /* 复古 OS 边框 — 黑紫外描边 + 3D 高光/阴影 */
  --os-border-dark:  #13101C;
  --os-highlight:    #FFFFFF;
  --os-shadow:       #3E3559;
  --os-border-raised: var(--os-highlight) var(--os-shadow) var(--os-shadow) var(--os-highlight);
  --os-border-inset:  var(--os-shadow) var(--os-highlight) var(--os-highlight) var(--os-shadow);
  --os-window-frame-shadow:
    inset 1px 1px 0 var(--os-highlight),
    inset -1px -1px 0 var(--os-shadow),
    8px 8px 0 rgba(19, 16, 28, 0.38);
```

- [ ] **Step 2: Replace `.window` border and shadow**

Change the `.window` rule from:

```css
  border: var(--border-window) solid transparent;
  border-image: var(--titlebar-active-bg) 1;     /* 渐变边框 */
  box-shadow: inset 0 0 0 2px var(--win-border),  /* 内边框（双层边框效果） */
              8px 8px 0 rgba(29, 27, 45, 0.35);   /* 右下偏移投影 */
```

To:

```css
  border: 1px solid var(--os-border-dark);        /* 最外层硬黑紫描边 */
  box-shadow: var(--os-window-frame-shadow);      /* 内层 3D 高光/阴影 + 投影 */
```

- [ ] **Step 3: Verify the window frame visually**

Run no automated tests. Open `prototype4.html` in a browser and confirm:

```text
Expected:
- Each window has a crisp darkest-purple 1px outer border.
- Window edges no longer use a gradient border.
- The top/left inner edge reads as highlighted.
- The bottom/right inner edge reads as shadowed.
- Existing active titlebar gradient remains visible.
```

### Task 2: Apply Raised Borders To Clickable Controls

**Files:**
- Modify: `prototype4.html`

**Interfaces:**
- Consumes: `--os-border-raised` from Task 1.
- Produces: raised visual treatment for buttons, taskbar controls, tags, cards, and post list items.

- [ ] **Step 1: Update titlebar and button-style controls**

For each selector below, replace the current single-value `border-color: var(--border-color);` with:

```css
  border-color: var(--os-border-raised);
```

Selectors to update:

```css
.titlebar
.window.active .titlebar
.titlebar-btn
.taskbar-start
.taskbar-tab
.taskbar-clock
.pixel-btn
.pixel-btn.primary
.pixel-tag
.pixel-card
.post-item
```

For `.titlebar-btn.close`, keep the red background rules unchanged.

- [ ] **Step 2: Update hit counter outer border**

Change `.hit-counter` from:

```css
  border-color: var(--border-color);  /* 凹陷效果 */
```

To:

```css
  border-color: var(--os-border-inset);  /* 凹陷效果 */
```

- [ ] **Step 3: Verify raised controls visually**

Open `prototype4.html` and confirm:

```text
Expected:
- Window titlebars and titlebar buttons look thicker and more OS-like.
- Taskbar start button and inactive task tabs look raised.
- Pixel buttons, tags, cards, and post items share the same raised border language.
- Close buttons remain red and readable.
```

### Task 3: Apply Inset Borders To Pressed And Input States

**Files:**
- Modify: `prototype4.html`

**Interfaces:**
- Consumes: `--os-border-inset` from Task 1.
- Produces: inset visual treatment for input fields and active taskbar tabs.

- [ ] **Step 1: Update input border treatment**

Change `.pixel-input` from:

```css
  border-color: var(--border-color);  /* 凹陷 */
```

To:

```css
  border-color: var(--os-border-inset);  /* 凹陷 */
```

- [ ] **Step 2: Update active taskbar tab treatment**

Change `.taskbar-tab.active` from:

```css
  border-color: var(--border-color);  /* 凹陷表示按下 */
```

To:

```css
  border-color: var(--os-border-inset);  /* 凹陷表示按下 */
```

- [ ] **Step 3: Verify inset states visually**

Open `prototype4.html` and confirm:

```text
Expected:
- Search input looks recessed instead of raised.
- Active taskbar tab looks pressed compared with inactive tabs.
- Focus rings still appear on keyboard focus.
```

### Task 4: Final Manual Verification

**Files:**
- Inspect: `prototype4.html`

**Interfaces:**
- Consumes: all CSS changes from Tasks 1-3.
- Produces: verified visual prototype.

- [ ] **Step 1: Run static file check**

Run:

```bash
rg "border-image|--os-border-dark|--os-border-raised|--os-border-inset" /Users/nstarlin/Desktop/code/my-blog/prototype4.html
```

Expected:

```text
- `border-image` should not appear in the `.window` rule.
- `--os-border-dark`, `--os-border-raised`, and `--os-border-inset` should appear.
```

- [ ] **Step 2: Browser smoke check**

Open:

```bash
open /Users/nstarlin/Desktop/code/my-blog/prototype4.html
```

Expected:

```text
- Initial windows render normally.
- Clicking desktop icons still opens/focuses windows.
- Dragging windows still works.
- Maximizing windows still works.
- Search input still filters results.
- No text overlaps are introduced by the border changes.
```

- [ ] **Step 3: Commit if repository is initialized**

This directory currently may not be a git repository. If `git status` succeeds, commit only `prototype4.html`:

```bash
git add /Users/nstarlin/Desktop/code/my-blog/prototype4.html
git commit -m "style: add retro OS window borders"
```

If `git status` fails with `not a git repository`, skip commit and report that no commit was created.

---

## Self-Review

- Spec coverage: covers dark outer window border, white top/left highlight, deep purple-gray bottom/right shadow, global CSS variables, and dynamic state consistency for active/inactive controls.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: CSS variable names are defined once in Task 1 and reused consistently in Tasks 2-3.

// Focus management for the hand-rolled dialog surfaces (H-26, session-6).
//
// The store's drawers/modals are custom (parity surfaces modeled on the
// reference markup), not Radix dialogs — so the a11y contract `role="dialog"
// aria-modal="true"` implies was previously unenforced: focus stayed on the
// opener and Tab walked into the occluded page. This module supplies the two
// missing behaviors as a plain DOM utility (SKILL §6: no custom hooks):
//
//   installFocusTrap(container) — focuses the container's first focusable
//   element, wraps Tab/Shift+Tab within it, and returns a cleanup that
//   restores focus to the previously-focused element.

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

export function installFocusTrap(container: HTMLElement): () => void {
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  // Initial focus: the first focusable control inside the panel (close
  // buttons lead the DOM on every surface wired today).
  const items = focusableIn(container);
  items[0]?.focus();

  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const focusable = focusableIn(container);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !container.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (current === last || !container.contains(current))) {
      event.preventDefault();
      first.focus();
    }
  };
  container.addEventListener("keydown", onKey);

  return () => {
    container.removeEventListener("keydown", onKey);
    previouslyFocused?.focus();
  };
}

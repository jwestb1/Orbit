import { css } from "lit";

// Shared `.section` / `.section-title` / `.hint` block used by both the
// settings dialog and the card config editor — kept in one place so the two
// don't drift out of sync (Lit has no CSS inheritance across unrelated
// custom elements, so each component still has to spread this into its own
// `static styles`).
export const dialogSectionStyles = css`
  .section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .section-title {
    font-weight: 500;
    color: var(--secondary-text-color);
  }
  .hint {
    margin: 0;
    font-size: 0.8em;
    color: var(--secondary-text-color);
  }
  .hint.error {
    color: var(--error-color, #db4437);
  }
`;

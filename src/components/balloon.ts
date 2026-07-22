import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("x-balloon")
export default class XBalloon extends LitElement {
  static styles = css`
    .balloon {
      background-color: var(--color-balloon-background);
      border-radius: var(--radius-balloon);
      box-sizing: border-box;
      color: var(--color-balloon-text);
      padding: 1rem;
      position: relative;
    }

    .balloon::after {
      border-block-end: 12px solid transparent;
      border-block-start: 12px solid var(--color-balloon-background);
      border-inline-end: 12px solid transparent;
      border-inline-start: 12px solid transparent;
      content: "";
      inset-block-start: 100%;
      inset-inline-start: 50%;
      margin-inline-start: -6px;
      position: absolute;
    }
  `;

  render() {
    return html`
      <div class="balloon">
        <slot></slot>
      </div>
    `;
  }
}

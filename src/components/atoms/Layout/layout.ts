import { LitElement, html } from '@polymer/lit-element';

class AtomLayout extends LitElement {

  margin: number;

  static get properties() {
    return {
      margin: { type: Number },
    };
  }

  constructor() {
    super();
  }

  render() {
    return html`
      <style>
        :host {
          --atom-layout-margin: ${this.margin};
        }
        div {
          margin-left: calc(var(--app-baseline-regular) * var(--atom-layout-margin));
          margin-right: calc(var(--app-baseline-regular) * var(--atom-layout-margin));
        }
      </style>
      <div>
        <slot></slot>
      </div>
    `;
  }

}

window.customElements.define('atom-layout', AtomLayout);

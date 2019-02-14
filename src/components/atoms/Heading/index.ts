import { LitElement, html } from 'lit-element';

class AtomHeading extends LitElement {

  static get properties() {
    return {
    };
  }

  _render() {
    return html`
      <style>
        :host {
          color: #f00;
        }
        h1 {
          color: #0f0;
          font-weight: normal;
        }
        h1 ::slotted {
          color: #00f;
        }
      </style>
      <h1><slot></slot></h1>
    `;
  }

}

window.customElements.define('atom-heading', AtomHeading);

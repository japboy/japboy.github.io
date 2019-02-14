import { LitElement, html } from 'lit-element';

class AtomLayoutGrid extends LitElement {

  column: number;

  static get properties() {
    return {
      column: { type: Number },
    };
  }

  constructor() {
    super();
  }

  render() {
    return html`
      <style>
        :host {
          --atom-layout-grid: calc((var(--app-column) * ${this.column}) + (var(--app-gutter) * ${this.column - 1}));
        }
        div {
          background-color: #eee;
          display: inline-block;
          margin-bottom: var(--app-gutter);
          margin-right: var(--app-gutter);
          width: var(--atom-layout-grid);
          min-height: var(--atom-layout-grid);
        }
      </style>
      <div>
        <h1>Yo</h1>
        <slot></slot>
      </div>
    `;
  }

}

window.customElements.define('atom-layout-grid', AtomLayoutGrid);

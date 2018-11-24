import { LitElement, html } from '@polymer/lit-element';

import '@/components/templates/Home';

export class PageHome extends LitElement {

  static get properties() {
    return {};
  }

  constructor() {
    super();
  }

  render() {
    return html`
      <template-home></template-home>
    `;
  }

}

window.customElements.define('page-home', PageHome);

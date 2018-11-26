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
      <template-home gravatar="1e4b7d2f20a2ecb20497d9b8704e6107"></template-home>
    `;
  }

}

window.customElements.define('page-home', PageHome);

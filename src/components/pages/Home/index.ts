import { LitElement, html } from 'lit-element';

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
      <template-home gravatar="f9e49553bb0b0b53887e6636664313ff"></template-home>
    `;
  }

}

window.customElements.define('page-home', PageHome);

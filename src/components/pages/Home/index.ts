import { PolymerElement, html } from '@polymer/polymer/polymer-element';

import { TemplateHome } from '@/components/templates/Home';

export class PageHome extends PolymerElement {
  static get template() {
    return html`
      <template-home></template-home>
    `;
  }

  constructor() {
    super();
  }

  static get properties() {
    return {};
  }
}

window.customElements.define('template-home', TemplateHome);

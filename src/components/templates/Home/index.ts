import { LitElement, html } from '@polymer/lit-element';

import '@/components/atoms/Layout';
import '@/components/atoms/Heading';

class TemplateHome extends LitElement {

  messages: string[];

  static get properties() {
    return {
      messages: { type: Array },
    };
  }

  constructor() {
    super();
    this.messages = [
      'Hey',
      'Hi!',
      'Hello.',
      'Greetings!',
      'Yo',
      'Hola~',
      'Hey',
      'Hi!',
      'Hello.',
      'Greetings!',
      'Yo',
      'Hola~',
    ];
  }

  render() {
    return html`
      <style>
        :host {
          --app-primary-color: #eee;
          --app-secondary-color: #000;

          display: block;
        }

        .testing {
          background-color: #eee;
        }
      </style>

      <atom-layout margin="3">
        <header>
          <h1>My portal.</h1>
          <ul role="navigation">
            <li>Unko</li>
            <li>Unko</li>
            <li>Unko</li>
          </ul>
        </header>

        <main>
          ${this.messages.map((message) => html`
            <atom-layout-grid column="3">
              <p>${message}</p>
            </atom-layout-grid>
          `)}
        </main>
      </atom-layout>
    `;
  }

}

window.customElements.define('template-home', TemplateHome);

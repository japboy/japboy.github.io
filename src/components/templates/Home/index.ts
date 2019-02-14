import { LitElement, html, property } from 'lit-element';

import '@/components/atoms/Balloon';

class TemplateHome extends LitElement {

  active: boolean = false;
  initialized: boolean = false;
  hired: boolean;

  @property({ type: String })
  gravatar;

  constructor() {
    super();
    setTimeout(this.toggle.bind(this), 600);
  }

  firstUpdated() {
    this.initialized = true;
  }

  toggle() {
    this.active = !this.active;
    if (this.initialized && !this.active) {
      this.hired = !this.hired;
    } else {
      this.hired = false;
    }
    this.requestUpdate();
  }

  render() {
    return html`
      <style>
        .portrait {
          background-color: #eee;
          border-radius: 50px;
          cursor: pointer;
          height: 100px;
          left: calc(50% - 50px);
          position: absolute;
          top: calc(75% - 50px);
          transform: rotate(0);
          transition-duration: 0.3s;
          transition-property: transform;
          width: 100px;
        }
        .portrait[aria-selected="true"] {
          transform: rotate(10deg);
        }
        .balloon {
          left: calc(50% - 140px);
          margin-top: 10px;
          opacity: 0;
          position: absolute;
          top: calc(75% - 340px);
          transition-duration: 0.3s;
          transition-property: margin-top, opacity;
        }
        .balloon[aria-selected="true"] {
          margin-top: 0;
          opacity: 1;
        }
        .linkedin {
          background-color: #0077b5;
          border-radius: 3px;
          box-sizing: border-box;
          color: #fff;
          left: 50%;
          margin-left: -38px;
          margin-top: 70px;
          position: absolute;
          text-align: center;
          top: 75%;
          width: 76px;
          padding: 3px;
          font-size: smaller;
        }
        .linkedin a:link,
        .linkedin a:visited {
          color: #fff;
          text-decoration: none;
        }
        @media only screen and (max-height: 400px) and (min-width: 600px) {
          .balloon {
            top: calc(75% - 260px);
            left: calc(50% - 240px);
          }
          .linkedin {
            margin-left: 60px;
            margin-top: 20px;
          }
        }
      </style>

      <main>
        <img
          aria-selected="${this.active ? 'true' : 'false'}"
          class="portrait"
          height="100"
          src="https://www.gravatar.com/avatar/${this.gravatar}?s=200"
          width="100"
          @click="${this.toggle}"
        >
        <atom-balloon
          aria-selected="${this.active ? 'true' : 'false'}"
          class="balloon"
          direction="bottom"
        >
          <p>Hi, I'm Yu Inao.<br>Currently working as a senior web frontend developer in Tokyo.</p>
          <p>My passions focus on web UI development, component-based UI design, performant web, web apps, &amp; web standards.</p>
        </atom-balloon>
        ${this.hired
          ? html`
            <p class="linkedin">
              <a href="https://www.linkedin.com/in/yuinao/">LinkedIn</a>
            </p>
          `
          : html``
        }
      </main>
    `;
  }

}

window.customElements.define('template-home', TemplateHome);

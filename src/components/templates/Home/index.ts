import { PolymerElement, html } from '@polymer/polymer/polymer-element';

import '@polymer/app-layout/app-drawer/app-drawer';
import '@polymer/app-layout/app-drawer-layout/app-drawer-layout';
import '@polymer/app-layout/app-header/app-header';
import '@polymer/app-layout/app-header-layout/app-header-layout';
import '@polymer/app-layout/app-scroll-effects/app-scroll-effects';
import '@polymer/app-layout/app-toolbar/app-toolbar';

import '@/components/atoms/SharedStyles';

export class TemplateHome extends PolymerElement {
  static get template() {
    return html`
      <style include="shared-styles">
        :host {
          --app-primary-color: #eee;
          --app-secondary-color: #000;

          display: block;
        }

        app-drawer-layout:not([narrow]) [drawer-toggle] {
          display: none;
        }

        app-header {
          color: #000;
          background-color: var(--app-primary-color);
        }

        app-header paper-icon-button {
          --paper-icon-button-ink-color: white;
        }

        .drawer-list {
          margin: 0 20px;
        }

        .drawer-list a {
          display: block;
          padding: 0 16px;
          text-decoration: none;
          color: var(--app-secondary-color);
          line-height: 40px;
        }

        .drawer-list a.iron-selected {
          color: black;
          font-weight: bold;
        }

        .content {
          padding: 16px;
        }
      </style>

      <app-drawer-layout fullbleed="" narrow="{{narrow}}">
        <!-- Drawer content -->
        <app-drawer id="drawer" slot="drawer" swipe-open="[[narrow]]">
          <app-toolbar>&hearts; Web Components</app-toolbar>
          <section class="content">
            <p>Polymer is great.</p>
          </section>
        </app-drawer>

        <!-- Main content -->
        <app-header-layout has-scrolling-region="">

          <app-header slot="header" condenses="" reveals="" effects="waterfall">
            <app-toolbar>
              <div main-title="">My portal.</div>
            </app-toolbar>
          </app-header>

          <section class="content">
            <p>web is awesome.</p>
          </section>
        </app-header-layout>
      </app-drawer-layout>
    `;
  }

  constructor() {
    super();
  }

  static get properties() {
    return {};
  }
}

import { faGithub, faLinkedin, type IconDefinition } from "@fortawesome/free-brands-svg-icons";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

const renderBrandIcon = ({ icon }: IconDefinition) => {
  const [width, height, , , pathData] = icon;
  const paths = Array.isArray(pathData) ? pathData : [pathData];

  return html`
    <svg aria-hidden="true" class="brand-icon" viewBox="0 0 ${width} ${height}">
      ${paths.map((path) => html`<path d="${path}"></path>`)}
    </svg>
  `;
};

@customElement("x-portrait")
export default class XPortrait extends LitElement {
  static styles = [
    css`
      :host {
        align-items: center;
        display: flex;
        flex-direction: column;
      }

      .portrait-trigger {
        appearance: button;
        background-color: transparent;
        block-size: 100px;
        border: 0 solid;
        border-radius: 9999px;
        color: inherit;
        cursor: pointer;
        font: inherit;
        inline-size: 100px;
        isolation: isolate;
        letter-spacing: inherit;
        margin: 0;
        padding: 0;
        position: relative;
      }

      .portrait-trigger::before,
      .portrait-trigger::after {
        background: conic-gradient(
          from 0deg,
          var(--color-model-loading-start),
          var(--color-model-loading-middle),
          var(--color-model-loading-end),
          var(--color-model-loading-start)
        );
        content: "";
        inset: -0.5rem;
        opacity: 0;
        pointer-events: none;
        position: absolute;
        z-index: -1;
      }

      .portrait-trigger::before {
        border-radius: 9999px;
        inset: -0.25rem;
      }

      .portrait-trigger::after {
        display: none;
      }

      :host([aria-busy="true"]) .portrait-trigger::before,
      :host([aria-busy="true"]) .portrait-trigger::after {
        opacity: 0.78;
        scale: 1;
      }

      .portrait-image {
        background-color: var(--color-portrait-background);
        block-size: auto;
        border-radius: 9999px;
        display: block;
        max-inline-size: 100%;
        transform-origin: center;
        vertical-align: middle;
      }

      .portrait-image[data-state="greeted"] {
        rotate: 10deg;
      }

      .portrait-image[data-state="resting"] {
        rotate: 0deg;
      }

      .social-links {
        align-items: center;
        display: flex;
        margin-block-start: 1rem;
      }

      .social-links[data-state="hidden"] {
        opacity: 0;
      }

      .social-links[data-state="visible"] {
        opacity: 1;
      }

      .social-link {
        color: inherit;
        display: block;
        margin-inline: 0.25rem;
        text-decoration: inherit;
      }

      .brand-icon {
        block-size: 1em;
        display: block;
        fill: currentColor;
        font-size: 1.5rem;
        inline-size: 1em;
        line-height: calc(2 / 1.5);
        vertical-align: middle;
      }

      @media (hover: hover) {
        .social-link:hover .brand-icon {
          color: var(--color-social-hover);
        }
      }

      @keyframes portrait-enter {
        from {
          opacity: 0;
          transform: translateY(0.5rem);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes model-loading-wave-soft-shape {
        from {
          border-radius: 58% 52% 61% 49% / 54% 63% 47% 56%;
        }

        14% {
          border-radius: 49% 63% 52% 58% / 62% 48% 64% 51%;
        }

        29% {
          border-radius: 65% 46% 57% 53% / 47% 66% 49% 61%;
        }

        43% {
          border-radius: 52% 59% 48% 63% / 64% 51% 62% 46%;
        }

        58% {
          border-radius: 61% 50% 64% 47% / 53% 65% 45% 59%;
        }

        72% {
          border-radius: 48% 64% 51% 60% / 67% 46% 63% 49%;
        }

        86% {
          border-radius: 63% 47% 59% 52% / 49% 64% 48% 62%;
        }

        to {
          border-radius: 58% 52% 61% 49% / 54% 63% 47% 56%;
        }
      }

      @keyframes model-loading-wave-soft-rotation {
        from {
          rotate: 0deg;
        }

        to {
          rotate: 360deg;
        }
      }

      @keyframes model-loading-wave-soft-envelope {
        from {
          scale: 0.94;
        }

        6% {
          scale: 1.06;
        }

        13% {
          scale: 0.93;
        }

        20% {
          scale: 1.1;
        }

        28% {
          scale: 0.96;
        }

        35% {
          scale: 1.04;
        }

        41% {
          scale: 0.92;
        }

        50% {
          scale: 1.08;
        }

        57% {
          scale: 0.95;
        }

        65% {
          scale: 1.03;
        }

        71% {
          scale: 0.94;
        }

        80% {
          scale: 1.09;
        }

        88% {
          scale: 0.93;
        }

        94% {
          scale: 1.05;
        }

        to {
          scale: 0.94;
        }
      }

      @keyframes model-loading-wave-detail-shape {
        from {
          border-radius: 53% 47% 52% 48% / 47.5% 53.5% 46.5% 52.5%;
          rotate: 360deg;
        }

        17% {
          border-radius: 48% 52% 46% 54% / 52% 48% 53% 47%;
        }

        35% {
          border-radius: 54% 46% 51% 49% / 49% 52% 48% 51%;
        }

        52% {
          border-radius: 47% 53% 52% 48% / 53% 47% 49% 51%;
        }

        69% {
          border-radius: 52% 48% 46% 54% / 48% 53% 47% 52%;
        }

        86% {
          border-radius: 49% 51% 54% 46% / 52% 48% 51% 49%;
        }

        to {
          border-radius: 53% 47% 52% 48% / 47.5% 53.5% 46.5% 52.5%;
          rotate: 0deg;
        }
      }

      @keyframes model-loading-wave-detail-envelope {
        from {
          scale: 0.943;
        }

        6% {
          scale: 0.997;
        }

        13% {
          scale: 0.939;
        }

        20% {
          scale: 1.015;
        }

        28% {
          scale: 0.952;
        }

        35% {
          scale: 0.988;
        }

        41% {
          scale: 0.934;
        }

        50% {
          scale: 1.006;
        }

        57% {
          scale: 0.948;
        }

        65% {
          scale: 0.984;
        }

        71% {
          scale: 0.943;
        }

        80% {
          scale: 1.011;
        }

        88% {
          scale: 0.939;
        }

        94% {
          scale: 0.993;
        }

        to {
          scale: 0.943;
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        :host {
          animation: portrait-enter 300ms ease-out 200ms 1 both;
        }

        .portrait-trigger::before,
        .portrait-trigger::after {
          scale: 0.92;
          transition:
            opacity var(--duration-model-loading-fade) var(--easing-interaction),
            scale var(--duration-interaction) var(--easing-interaction);
        }

        .portrait-trigger::before {
          border-radius: 58% 52% 61% 49% / 54% 63% 47% 56%;
          filter: blur(0.225rem);
          inset: -0.375rem;
        }

        .portrait-trigger::after {
          border-radius: 53% 47% 52% 48% / 47.5% 53.5% 46.5% 52.5%;
          display: block;
          filter: blur(0.11rem);
          inset: -0.275rem;
        }

        .portrait-image {
          transition-duration: var(--duration-interaction);
          transition-property: rotate;
          transition-timing-function: var(--easing-interaction);
        }

        .social-links {
          transition-duration: var(--duration-interaction);
          transition-property: opacity;
          transition-timing-function: var(--easing-interaction);
        }

        .brand-icon {
          transition: color var(--duration-interaction) var(--easing-interaction);
        }

        :host([aria-busy="true"]) .portrait-trigger::before {
          animation:
            model-loading-wave-soft-shape 4.7s ease-in-out infinite,
            model-loading-wave-soft-rotation 8.3s linear infinite,
            model-loading-wave-soft-envelope 13.7s ease-in-out infinite;
        }

        :host([aria-busy="true"]) .portrait-trigger::after {
          animation:
            model-loading-wave-detail-shape 2.9s ease-in-out infinite,
            model-loading-wave-detail-envelope 13.7s ease-in-out infinite;
        }
      }
    `,
  ];

  private gravatarHash: string = "8ee46c5a47f14df0c4bed462c7688bae333a1551320ef334a8367f9f071cd28f";
  private gravatarUrl: string = `https://www.gravatar.com/avatar/${this.gravatarHash}?s=200`;

  @property({ type: Boolean })
  greeted: boolean = false;

  @property({ type: Boolean })
  initiated: boolean = false;

  firstUpdated(): void {
    const [entryAnimation] = this.getAnimations();

    if (entryAnimation === undefined) {
      this.notifyEntryComplete();
      return;
    }

    void entryAnimation.finished.then(
      () => this.notifyEntryComplete(),
      () => this.notifyEntryComplete(),
    );
  }

  render() {
    return html`
      <button
        aria-controls="social-links"
        aria-expanded="${this.socialLinksVisible}"
        aria-label="${this.portraitActionLabel}"
        class="portrait-trigger"
        type="button"
        @click="${this.toggle}"
      >
        <img
          alt="Yu Inao"
          class="portrait-image"
          data-state="${this.greeted ? "greeted" : "resting"}"
          height="100"
          src="${this.gravatarUrl}"
          width="100"
        />
      </button>

      <div
        aria-hidden="${this.socialLinksVisible ? nothing : "true"}"
        class="social-links"
        data-state="${this.socialLinksVisible ? "visible" : "hidden"}"
        id="social-links"
      >
        <a aria-label="LinkedIn" class="social-link" href="${this.linkedin}">
          ${renderBrandIcon(faLinkedin)}
        </a>
        <a aria-label="GitHub" class="social-link" href="${this.github}">
          ${renderBrandIcon(faGithub)}
        </a>
      </div>
    `;
  }

  private get socialLinksVisible(): boolean {
    return this.initiated && !this.greeted;
  }

  private get portraitActionLabel(): string {
    return this.socialLinksVisible ? "Show introduction" : "Show social links";
  }

  private get linkedin(): string | typeof nothing {
    return this.socialLinksVisible ? "https://www.linkedin.com/in/yuinao" : nothing;
  }

  private get github(): string | typeof nothing {
    return this.socialLinksVisible ? "https://github.com/japboy" : nothing;
  }

  private toggle(): void {
    this.dispatchEvent(
      new CustomEvent("greeting-change", {
        bubbles: true,
        composed: true,
        detail: { greeted: !this.greeted },
      }),
    );
  }

  private notifyEntryComplete(): void {
    this.dispatchEvent(
      new CustomEvent("portrait-entry-complete", {
        bubbles: true,
        composed: true,
      }),
    );
  }
}

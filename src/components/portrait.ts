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
        animation: portrait-enter 300ms ease-out 200ms 1 both;
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
        scale: 0.92;
        transition:
          opacity var(--duration-model-loading-fade) var(--easing-interaction),
          scale var(--duration-interaction) var(--easing-interaction);
        z-index: -1;
      }

      .portrait-trigger::before {
        border-radius: 45% 55% 47% 53% / 54% 44% 56% 46%;
        filter: blur(0.45rem);
        inset: -0.75rem;
      }

      .portrait-trigger::after {
        border-radius: 56% 44% 54% 46% / 45% 57% 43% 55%;
        filter: blur(0.22rem);
        inset: -0.55rem;
      }

      .portrait-trigger[data-model-loading="true"]::before,
      .portrait-trigger[data-model-loading="true"]::after {
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
        transition-duration: var(--duration-interaction);
        transition-property: transform, translate, scale, rotate;
        transition-timing-function: var(--easing-interaction);
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
        transition-duration: var(--duration-interaction);
        transition-property: opacity;
        transition-timing-function: var(--easing-interaction);
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
        transition: color var(--duration-interaction) var(--easing-interaction);
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

      @keyframes model-loading-wave-clockwise {
        from {
          border-radius: 45% 55% 47% 53% / 54% 44% 56% 46%;
          rotate: 0deg;
          scale: 0.92;
        }

        25% {
          border-radius: 58% 42% 54% 46% / 43% 57% 45% 55%;
          scale: 1.1;
        }

        50% {
          border-radius: 48% 52% 42% 58% / 59% 46% 54% 41%;
          scale: 0.94;
        }

        75% {
          border-radius: 54% 46% 59% 41% / 47% 58% 42% 53%;
          scale: 1.08;
        }

        to {
          border-radius: 45% 55% 47% 53% / 54% 44% 56% 46%;
          rotate: 360deg;
          scale: 0.92;
        }
      }

      @keyframes model-loading-wave-counterclockwise {
        from {
          border-radius: 56% 44% 54% 46% / 45% 57% 43% 55%;
          rotate: 360deg;
          scale: 1.08;
        }

        33% {
          border-radius: 43% 57% 46% 54% / 56% 44% 58% 42%;
          scale: 0.93;
        }

        66% {
          border-radius: 53% 47% 58% 42% / 44% 56% 46% 54%;
          scale: 1.07;
        }

        to {
          border-radius: 56% 44% 54% 46% / 45% 57% 43% 55%;
          rotate: 0deg;
          scale: 1.08;
        }
      }

      @media (prefers-reduced-motion: no-preference) {
        .portrait-trigger[data-model-loading="true"]::before {
          animation: model-loading-wave-clockwise 3.2s ease-in-out infinite;
        }

        .portrait-trigger[data-model-loading="true"]::after {
          animation: model-loading-wave-counterclockwise 2.4s ease-in-out infinite;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
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

  @property({ attribute: "model-loading", type: Boolean })
  modelLoading: boolean = false;

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
        data-model-loading="${this.modelLoading}"
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

import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "./balloon.js";
import "./portrait.js";

type GreetingState = "pending" | "greeted" | "revealed";

export type CareerIntroductionPresentationState =
  | { status: "fallback" }
  | { language: string; status: "generating"; text: string }
  | { language: string; status: "paused"; text: string }
  | { language: string; status: "waiting"; text: string };

export interface GreetingVisibilityChangeDetail {
  visible: boolean;
}

declare global {
  interface HTMLElementEventMap {
    "greeting-visibility-change": CustomEvent<GreetingVisibilityChangeDetail>;
  }
}

@customElement("x-hello")
export default class XHello extends LitElement {
  static styles = [
    css`
      :host {
        --content-gap: 2rem;
        --content-inline-gutter: 1rem;
        --readable-line-length: 65ch;
      }

      .viewport {
        align-items: center;
        background-color: var(--color-page-background);
        box-sizing: border-box;
        color: var(--color-page-text);
        display: flex;
        flex-direction: column-reverse;
        gap: var(--content-gap);
        justify-content: center;
        min-block-size: 100vh;
        min-block-size: 100dvh;
        padding-inline: var(--content-inline-gutter);
      }

      .greeting {
        inline-size: 100%;
        max-inline-size: var(--readable-line-length);
        transition-duration: var(--duration-interaction);
        transition-property: all;
        transition-timing-function: var(--easing-interaction);
      }

      .greeting[data-state="visible"] {
        opacity: 1;
        translate: 0 0;
      }

      .greeting[data-state="hidden"] {
        opacity: 0;
        pointer-events: none;
        translate: 0 0.25rem;
      }

      p {
        margin: 0;
      }

      .career-introduction {
        white-space: pre-line;
      }

      .visually-hidden {
        block-size: 1px;
        clip-path: inset(50%);
        inline-size: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
      }
    `,
  ];

  @state()
  private greetingState: GreetingState = "pending";

  @property({ attribute: false, type: Boolean })
  modelLoading: boolean = false;

  @property({ attribute: false })
  careerIntroduction: CareerIntroductionPresentationState = { status: "fallback" };

  get greetingVisible(): boolean {
    return this.greetingState === "greeted";
  }

  render() {
    const initiated = this.greetingState !== "pending";
    const greeted = this.greetingVisible;
    const generatedText =
      this.careerIntroduction.status === "fallback" ? "" : this.careerIntroduction.text;
    const lang =
      this.careerIntroduction.status === "fallback" ? undefined : this.careerIntroduction.language;
    const hasGeneratedText = generatedText.length > 0;
    const isGenerating = this.careerIntroduction.status === "generating";
    const completedAnnouncement =
      this.careerIntroduction.status === "waiting" ? this.careerIntroduction.text : undefined;

    return html`
      <div class="viewport">
        <x-portrait
          ?greeted="${greeted}"
          ?initiated="${initiated}"
          ?model-loading="${this.modelLoading}"
          @greeting-change="${this.changeGreeting}"
          @portrait-entry-complete="${this.completeGreeting}"
        ></x-portrait>

        <x-balloon
          aria-busy="${isGenerating}"
          aria-hidden="${!greeted}"
          class="greeting"
          data-state="${greeted ? "visible" : "hidden"}"
        >
          ${hasGeneratedText
            ? html`<p class="career-introduction" dir="auto" lang="${lang}">${generatedText}</p>`
            : html`
                <p>
                  Hi, I'm Yu Inao.
                  <br />
                  Currently working as a senior web frontend developer in Tokyo.
                </p>
                <p>
                  My passions focus on web UI development, component-based UI design, performant
                  web, web apps, &amp; web standards.
                </p>
              `}
        </x-balloon>
        <p
          aria-atomic="true"
          aria-live="polite"
          class="visually-hidden"
          dir="auto"
          lang="${lang ?? nothing}"
        >
          ${completedAnnouncement ?? nothing}
        </p>
      </div>
    `;
  }

  private changeGreeting(event: CustomEvent<{ greeted: boolean }>): void {
    this.updateGreetingState(event.detail.greeted ? "greeted" : "revealed");
  }

  private completeGreeting(): void {
    if (this.greetingState === "pending") {
      this.updateGreetingState("greeted");
    }
  }

  private updateGreetingState(state: GreetingState): void {
    const wasVisible = this.greetingVisible;
    this.greetingState = state;

    if (this.greetingVisible === wasVisible) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<GreetingVisibilityChangeDetail>("greeting-visibility-change", {
        bubbles: true,
        composed: true,
        detail: { visible: this.greetingVisible },
      }),
    );
  }
}

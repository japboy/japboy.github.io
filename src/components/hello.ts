import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";

import "./balloon.js";
import "./portrait.js";

type GreetingState = "pending" | "greeted" | "revealed";

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
    `,
  ];

  @state()
  private greetingState: GreetingState = "pending";

  render() {
    const initiated = this.greetingState !== "pending";
    const greeted = this.greetingState === "greeted";

    return html`
      <div class="viewport">
        <x-portrait
          ?greeted="${greeted}"
          ?initiated="${initiated}"
          @greeting-change="${this.changeGreeting}"
          @portrait-entry-complete="${this.completeGreeting}"
        ></x-portrait>

        <x-balloon
          aria-hidden="${!greeted}"
          class="greeting"
          data-state="${greeted ? "visible" : "hidden"}"
        >
          <p>
            Hi, I'm Yu Inao.
            <br />
            Currently working as a senior web frontend developer in Tokyo.
          </p>
          <p>
            My passions focus on web UI development, component-based UI design, performant web, web
            apps, &amp; web standards.
          </p>
        </x-balloon>
      </div>
    `;
  }

  private changeGreeting(event: CustomEvent<{ greeted: boolean }>): void {
    this.greetingState = event.detail.greeted ? "greeted" : "revealed";
  }

  private completeGreeting(): void {
    if (this.greetingState === "pending") {
      this.greetingState = "greeted";
    }
  }
}

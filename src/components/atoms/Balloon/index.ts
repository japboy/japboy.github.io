import { LitElement, html, property } from 'lit-element';

enum Direction {
  Top = 'top',
  Left = 'left',
  Right = 'right',
  Bottom = 'bottom',
}

class AtomBalloon extends LitElement {

  @property({ type: String })
  direction = Direction.Bottom;

  constructor() {
    super();
  }

  render() {
    return html`
      <style>
        :host {
          display: inline-block;
          position: relative;
        }
        .balloon {
          background-color: #0a0a0a;
          border-radius: 3px;
          box-sizing: border-box;
          color: #fff;
          display: inline-block;
          font-size: 16px;
          margin: 1.5em 0;
          width: 280px;
          padding: 7px 10px;
          position: relative;
        }
        .balloon.bottom::before {
          border-bottom: 15px solid transparent;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 15px solid #0a0a0a;
          content: "";
          left: 50%;
          margin-left: -15px;
          position: absolute;
          top: 100%;
        }
        .balloon.top::before {
          border-bottom: 15px solid #0a0a0a;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 15px solid transparent;
          content: "";
          left: 50%;
          margin-left: -15px;
          margin-top: -30px;
          position: absolute;
          top: 0;
        }
        @media only screen and (max-height: 400px) and (min-width: 600px) {
          .balloon {
            width: 480px;
          }
        }
      </style>
      <div class="balloon ${this.direction}">
        <slot></slot>
      </div>
    `;
  }

}

window.customElements.define('atom-balloon', AtomBalloon);

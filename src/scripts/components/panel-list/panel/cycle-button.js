import Util from '@services/util';
import './cycle-button.scss';

/**
 * Cycle button.
 */
export default class CycleButton {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onClicked] On clicked handler.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {}
    }, callbacks);

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-discrete-option-multi-choice-cycle-button');
    this.dom.addEventListener('click', () => {
      this.select( (this.selectedIndex + 1) % this.params.options.length );
      this.callbacks.onClicked(this.selectedIndex);
    });

    this.select(0); // TODO: Previous state.
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Select index.
   *
   * @param {number} index Index of option to choose.
   */
  select(index) {
    if (
      typeof index !== 'number' ||
      index < 0 || index > this.params.options.length - 1
    ) {
      return;
    }

    this.selectedIndex = index;
    this.dom.innerHTML = this.params.options[this.selectedIndex].value;
  }

  /**
   * Enable.
   */
  enable() {
    this.dom.removeAttribute('disabled');
  }

  /**
   * Disable.
   */
  disable() {
    this.dom.setAttribute('disabled', 'disabled');
  }
}

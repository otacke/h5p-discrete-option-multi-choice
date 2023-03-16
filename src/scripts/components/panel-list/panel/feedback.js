/**
 * Feedback button.
 */
export default class Feedback {
  /**
   * @class
   */
  constructor() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-discrete-option-multi-choice-feedback');
    this.dom.classList.add('display-none');
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} Feedback DOM.
   */
  getDOM() {
    return this.dom;
  }
}

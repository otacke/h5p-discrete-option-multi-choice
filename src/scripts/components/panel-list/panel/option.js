import Util from '@services/util';
import OptionButton from './option-button';
import CycleButton from './cycle-button';
import './option.scss';

/**
 * Option.
 */
export default class Option {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {boolean} params.correct True, if option is correct.
   * @param {HTMLElement} params.text Text for option.
   * @param {object} [params.selector] Selector configuration.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onAnswered] Option was answered.
   */
  constructor(params = {}, callbacks = {}) {
    this.callbacks = Util.extend({
      onAnswered: () => {},
      onConfidenceChanged: () => {}
    }, callbacks);

    this.confidenceIndex = 0;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-discrete-option-multi-choice-option');

    const text = document.createElement('div');
    text.classList.add('h5p-discrete-option-multi-choice-option-text');
    text.innerHTML = params.text;
    this.dom.append(text);

    if (params.selector) {
      this.selector = new CycleButton(
        params.selector,
        {
          onClicked: (index) => {
            this.confidenceIndex = index;
          }
        }
      );
      this.dom.append(this.selector.getDOM());
    }

    const choices = document.createElement('div');
    choices.classList.add('h5p-discrete-option-multi-choice-choices');
    this.dom.append(choices);

    this.choiceCorrect = new OptionButton(
      {
        classes: ['correct']
      },
      {
        onClicked: () => {
          this.selected = this.choiceCorrect;
          this.choiceCorrect.select();
          this.callbacks.onAnswered(true, this.confidenceIndex);
        }
      }
    );
    choices.append(this.choiceCorrect.getDOM());

    this.choiceIncorrect = new OptionButton(
      {
        classes: ['incorrect']
      },
      {
        onClicked: () => {
          this.selected = this.choiceIncorrect;
          this.choiceIncorrect.select();
          this.callbacks.onAnswered(false, this.confidenceIndex);
        }
      }
    );
    choices.append(this.choiceIncorrect.getDOM());
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} Option DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Mark answer.
   *
   * @param {boolean|null} correct True: correct. False: incorrect. Null: reset.
   * @param {HTMLElement|undefined} [scorePoints] Score points.
   */
  markAnswer(correct, scorePoints) {
    if (typeof correct !== 'boolean' && correct !== null) {
      return;
    }

    this.selected?.markAnswer(correct, scorePoints);
  }

  /**
   * Mark option.
   *
   * @param {object} [params={}] Parameters.
   */
  markOption(params = {}) {
    if (typeof params.correct === 'boolean' || params.correct === null) {
      this.choiceCorrect.markOption(params.correct);
    }

    if (typeof params.incorrect === 'boolean' || params.incorrect === null) {
      this.choiceIncorrect.markOption(params.incorrect);
    }
  }

  /**
   * Enable.
   */
  enable() {
    this.selector?.enable();
    this.choiceCorrect.enable();
    this.choiceIncorrect.enable();
  }

  /**
   * Disable.
   */
  disable() {
    this.selector?.disable();
    this.choiceCorrect.disable();
    this.choiceIncorrect.disable();
  }

  /**
   * Reset.
   */
  reset() {
    this.selected = null;
    this.choiceCorrect.unselect();
    this.choiceIncorrect.unselect();
  }
}

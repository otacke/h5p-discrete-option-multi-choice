import Util from '@services/util';
import Option from './option';
import Feedback from './feedback';
import './panel.scss';

/**
 * Panel list.
 */
export default class Panel {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} params.options Answer options.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onAnswered] Option was answered.
   * @param {function} [callbacks.onConfidenceChanged] Confidence changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.callbacks = Util.extend({
      onAnswered: () => {},
      onConfidenceChanged: () => {}
    }, callbacks);

    this.dom = document.createElement('li');
    this.dom.classList.add('h5p-discrete-option-multi-choice-panel');

    this.option = new Option(
      {
        text: params.options.text,
        correct: params.options.correct,
        ...(
          Object.keys(params.options.selector || {}).length &&
          { selector: params.options.selector }
        ),
        confidenceIndex: params.options.confidenceIndex
      },
      {
        onAnswered: (score) => {
          this.callbacks.onAnswered(score);
        },
        onConfidenceChanged: (confidenceIndex) => {
          this.callbacks.onConfidenceChanged(confidenceIndex);
        }
      }
    );
    this.dom.append(this.option.getDOM());

    this.feedback = new Feedback({
      chosenFeedback: params.chosenFeedback,
      notChosenFeedback: params.notChosenFeedback
    });
    this.dom.append(this.feedback.getDOM());
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} Panel list DOM.
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

    this.option.markAnswer(correct, scorePoints);
  }

  /**
   * Mark option.
   *
   * @param {object} [params={}] Parameters.
   */
  markOption(params = {}) {
    this.option.markOption(params);
  }

  /**
   * Enable.
   */
  enable() {
    this.option.enable();
  }

  /**
   * Disable.
   */
  disable() {
    this.option.disable();
  }

  /**
   * Reset.
   *
   * @param {object} [params={}] Parameters.
   */
  reset(params = {}) {
    params = Util.extend({
      previousState: {}
    }, params);

    this.option.reset({ previousState: params.previousState });
  }
}

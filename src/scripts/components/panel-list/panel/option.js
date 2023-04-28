import Dictionary from '@services/dictionary';
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
   * @param {string} params.labelUUID UUID for text HTML element
   * @param {string} params.text Text for option.
   * @param {object} [params.selector] Selector configuration.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onAnswered] Option was answered.
   * @param {function} [callbacks.onConfidenceChanged] Confidence changed.
   * @param {function} [callbacks.onGotFocus] Panel element got gocus.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = params;

    this.ariaLabelText = Util.stripHTML(this.params.text);
    this.ariaLabelText =
      this.ariaLabelText.substring(this.ariaLabelText.length - 1) === '.' ?
        this.ariaLabelText.substring(0, this.params.text.length - 1) :
        this.ariaLabelText;

    this.callbacks = Util.extend({
      onAnswered: () => {},
      onConfidenceChanged: () => {},
      onGotFocus: () => {}
    }, callbacks);

    this.isDisabled = true;
    this.answeredCorrectly = null;
    this.correctIsCorrect = null;

    this.focusElements = [];

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-discrete-option-multi-choice-option');
    if (params.selector) {
      this.dom.classList.add('has-confidence-selector');
    }

    this.dom.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
        const position = this.focusElements.indexOf(this.currentFocusElement);
        if (position > 0) {
          this.currentFocusElement = this.focusElements[position - 1];
          this.currentFocusElement.focus();
        }
      }
      else if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
        const position = this.focusElements.indexOf(this.currentFocusElement);
        if (position < this.focusElements.length - 1) {
          this.currentFocusElement = this.focusElements[position + 1];
          this.currentFocusElement.focus();
        }
      }
      else if (event.code === 'Home') {
        this.focusElements[0].focus();
      }
      else if (event.code === 'End') {
        this.focusElements[this.focusElements.length - 1].focus();
      }
      else {
        return;
      }

      event.preventDefault();
    });

    const text = document.createElement('div');
    text.classList.add('h5p-discrete-option-multi-choice-option-text');
    text.innerHTML = params.text;
    this.dom.append(text);

    this.actions = document.createElement('div');
    this.actions.classList.add(
      'h5p-discrete-option-multi-choice-option-actions'
    );
    this.actions.setAttribute('id', params.uuid);
    this.dom.append(this.actions);

    if (params.selector) {
      this.confidenceSelector = new CycleButton(
        {
          selector: params.selector,
          confidenceIndex: params.confidenceIndex
        },
        {
          onClicked: (confidenceIndex) => {
            this.callbacks.onConfidenceChanged(confidenceIndex);
          },
          onGotFocus: () => {
            this.currentFocusElement = this.confidenceSelector;
            this.callbacks.onGotFocus();
          }
        }
      );
      this.actions.append(this.confidenceSelector.getDOM());
      this.focusElements.push(this.confidenceSelector);
    }

    const choices = document.createElement('div');
    choices.classList.add('h5p-discrete-option-multi-choice-choices');
    this.actions.append(choices);

    this.choiceCorrect = new OptionButton(
      {
        type: 'correct'
      },
      {
        onClicked: () => {
          this.selected = this.choiceCorrect;
          this.choiceCorrect.select();
          this.updateAriaLabel();
          this.callbacks.onAnswered(true);
        },
        onGotFocus: () => {
          this.currentFocusElement = this.choiceCorrect;
          this.callbacks.onGotFocus();
        }
      }
    );
    choices.append(this.choiceCorrect.getDOM());
    this.focusElements.push(this.choiceCorrect);

    this.choiceIncorrect = new OptionButton(
      {
        type: 'incorrect'
      },
      {
        onClicked: () => {
          this.selected = this.choiceIncorrect;
          this.choiceIncorrect.select();
          this.updateAriaLabel();
          this.callbacks.onAnswered(false);
        },
        onGotFocus: () => {
          this.currentFocusElement = this.choiceIncorrect;
          this.callbacks.onGotFocus();
        }
      }
    );
    choices.append(this.choiceIncorrect.getDOM());
    this.focusElements.push(this.choiceIncorrect);

    this.updateAriaLabel();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Option DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update ARIA label.
   */
  updateAriaLabel() {
    const labelSegments = [this.ariaLabelText];

    if (this.isDisabled) {
      if (this.selected === this.choiceCorrect) {
        labelSegments.push(
          Dictionary.get('a11y.youMarkedThisAs')
            .replace(/@correctness/, Dictionary.get('a11y.correct'))
        );
      }
      else if (this.selected === this.choiceIncorrect) {
        labelSegments.push(
          Dictionary.get('a11y.youMarkedThisAs')
            .replace(/@correctness/, Dictionary.get('a11y.incorrect'))
        );
      }

      if (this.confidenceSelector) {
        labelSegments.push(
          Dictionary.get('a11y.confidenceAt')
            .replace(/@value/, this.confidenceSelector.getCurrentValue())
        );
      }

      if (typeof this.answeredCorrectly === 'boolean') {
        const correctness = this.answeredCorrectly ?
          Dictionary.get('a11y.correct') :
          Dictionary.get('a11y.incorrect');

        labelSegments.push(
          Dictionary.get('a11y.yourAnswerWas')
            .replace(/@correctness/, correctness)
        );
      }

      if (
        typeof this.correctIsCorrect === 'boolean' &&
        this.answeredCorrectly === false
      ) {
        const correctness = this.correctIsCorrect ?
          Dictionary.get('a11y.correct') :
          Dictionary.get('a11y.incorrect');

        labelSegments.push(
          Dictionary.get('a11y.correctAnswerWas')
            .replace(/@correctness/, correctness)
        );
      }
    }
    else {
      if (this.confidenceSelector) {
        labelSegments.push(Dictionary.get('a11y.taskConfidenceMark'));
      }
      else {
        labelSegments.push(Dictionary.get('a11y.taskMark'));
      }
    }

    // Ensure . at the end to have pause between automated and custom feedback.
    let label = labelSegments.join('. ');
    if (label.substring(label.length - 1) !== '.') {
      label = `${label}.`;
    }

    this.dom.setAttribute('aria-label', label);
  }

  /**
   * Mark answer.
   * @param {boolean|null} correct True: correct. False: incorrect. Null: reset.
   * @param {HTMLElement|undefined} [scorePoints] Score points.
   */
  markAnswer(correct, scorePoints) {
    if (typeof correct !== 'boolean' && correct !== null) {
      return;
    }

    this.answeredCorrectly = correct;

    this.selected?.markAnswer(correct, scorePoints);

    this.updateAriaLabel();
  }

  /**
   * Mark option as the correct solution.
   * @param {object} [params={}] Parameters.
   */
  markOption(params = {}) {
    if (typeof params.correct === 'boolean' || params.correct === null) {
      this.choiceCorrect.markOption(params.correct);
      this.correctIsCorrect = true;
    }

    if (typeof params.incorrect === 'boolean' || params.incorrect === null) {
      this.choiceIncorrect.markOption(params.incorrect);
      this.correctIsCorrect = false;
    }

    this.updateAriaLabel();
  }

  /**
   * Focus first element.
   */
  focus() {
    if (this.confidenceSelector) {
      this.confidenceSelector.focus();
    }
    else {
      this.choiceCorrect.focus();
    }
  }

  /**
   * Enable.
   */
  enable() {
    this.isDisabled = false;

    this.confidenceSelector?.enable();
    this.choiceCorrect.enable();
    this.choiceIncorrect.enable();

    this.updateAriaLabel();
  }

  /**
   * Disable.
   */
  disable() {
    this.isDisabled = true;

    this.confidenceSelector?.disable();
    this.choiceCorrect.disable();
    this.choiceIncorrect.disable();

    this.updateAriaLabel();
  }

  /**
   * Reset.
   * @param {object} [params={}] Parameters.
   */
  reset(params = {}) {
    this.answeredCorrectly = null;
    this.correctIsCorrect = null;

    if (typeof params?.previousState?.userAnswer === 'boolean') {
      this.selected = params.previousState.userAnswer ?
        this.choiceCorrect :
        this.choiceIncorrect;

      this.selected.select();
    }
    else {
      this.selected = null;
      this.choiceCorrect.unselect();
      this.choiceIncorrect.unselect();
    }

    if (this.confidenceSelector) {
      this.confidenceSelector.select(
        params?.previousState?.confidenceIndex ?? 0
      );
    }

    this.updateAriaLabel();
  }
}

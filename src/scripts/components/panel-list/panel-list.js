import Globals from '@services/globals';
import Util from '@services/util';
import Panel from '@components/panel-list/panel/panel';
import './panel-list.scss';

/**
 * Panel list.
 */
export default class PanelList {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onAnswered] Option was answered.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      options: []
    }, params);

    this.callbacks = Util.extend({
      onAnswered: () => {},
      onConfidenceChanged: () => {}
    }, callbacks);

    this.dom = document.createElement('ul');
    this.dom.classList.add('h5p-discrete-option-multi-choice-panel-list');

    this.panels = params.options.map((option, index) => {
      return new Panel(
        {
          options: option
        },
        {
          onAnswered: (score) => {
            this.handleAnswered(index, score);
          },
          onConfidenceChanged: (confidenceIndex) => {
            this.handleConfidenceChanged(index, confidenceIndex);
          }
        }
      );
    });

    this.attachPanel(0);
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
   * Show feedback.
   *
   * @param {object} [params={}] Parameters.
   * @param {(boolean|null)[]} params.selected Selected answers.
   */
  showFeedback(params = {}) {
    this.panels.forEach((panel, index) => {
      panel.showFeedback({ selected: params.selected[index] });
    });
  }

  /**
   * Show results.
   *
   * @param {H5P.Question.ScorePoints} [scorePoints] Score points.
   */
  showResults(scorePoints) {
    this.panels.forEach((panel, index) => {
      if (this.params.options[index].isOvertime) {
        return;
      }

      const wasAnswerCorrect =
        this.params.options[index].correct ===
        this.params.options[index].userAnswer;

      // Mark selected answer option correctness
      panel.markAnswer(
        wasAnswerCorrect,
        scorePoints?.getElement(wasAnswerCorrect)
      );
    });
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.showResults();

    this.panels.forEach((panel, index) => {
      // Mark expected answer option
      const markOptions = (this.params.options[index].correct) ?
        ({ correct: true }) :
        ({ incorrect: true });
      panel.markOption(markOptions);
    });
  }

  /**
   * Handle user answered.
   *
   * @param {number} index Index of answer option.
   * @param {boolean} userAnswer User answer.
   */
  handleAnswered(index, userAnswer) {
    this.callbacks.onAnswered(index, userAnswer);
  }

  /**
   * Handle user changed confidence.
   *
   * @param {number} index Index of answer option.
   * @param {boolean} confidenceIndex Confidence index.
   */
  handleConfidenceChanged(index, confidenceIndex) {
    this.callbacks.onConfidenceChanged(index, confidenceIndex);
  }

  /**
   * Enable panel.
   *
   * @param {number} index Index of panel to enable.
   */
  enablePanel(index) {
    if (!this.panelExists(index)) {
      return;
    }

    this.panels[index].enable();
  }

  /**
   * Disable panel.
   *
   * @param {number} index Index of panel to disable.
   */
  disablePanel(index) {
    if (!this.panelExists(index)) {
      return;
    }

    this.panels[index].disable();
  }

  /**
   * Disable all panels.
   */
  disableAll() {
    for (let index = 0; index < this.panels.length; index++) {
      this.disablePanel(index);
    }
  }

  /**
   * Focus panel.
   *
   * @param {number} index Index of panel to give focus to.
   */
  focus(index) {
    if (!this.panelExists(index)) {
      return;
    }

    this.panels[index].focus();
  }

  /**
   * Attach all options.
   */
  attachAllOptions() {
    const alreadyAttachedCount = this.dom.childNodes.length;

    this.panels.forEach((panel, index) => {
      if (index < alreadyAttachedCount) {
        return;
      }

      this.dom.append(this.panels[index].getDOM());
      this.panels[index].disable();
    });

    Globals.get('resize')();
  }

  /**
   * Attach option.
   *
   * @param {number} index Index of option to attach.
   */
  attachPanel(index) {
    if (!this.panelExists(index)) {
      return;
    }

    this.dom.append(this.panels[index].getDOM());
    this.panels[index].enable();

    Globals.get('resize')();
  }

  /**
   * Determine whether panel exists.
   *
   * @param {number} index Index of panel to check for.
   * @returns {boolean} True if panel exists. Else false.
   */
  panelExists(index) {
    return (
      typeof index === 'number' &&
      index >= 0 && index < this.panels.length
    );
  }

  /**
   * Reset.
   *
   * @param {object} [params={}] Parameters.
   */
  reset(params = {}) {
    params = Util.extend({
      previousState: []
    }, params);

    this.panels.forEach((panel, index) => {
      panel.reset({ previousState: params.previousState?.[index] });
    });
  }
}

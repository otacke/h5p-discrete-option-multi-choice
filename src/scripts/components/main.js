import Globals from '@services/globals';
import Util from '@services/util';
import PanelList from '@components/panel-list/panel-list';

/**
 * Main DOM component incl. main controller.
 */
export default class Main {
  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   * @param {function} [callbacks.onAnswerGiven] User gave answer.
   * @param {function} [callbacks.onGameOver] Game is over.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onAnswered: () => {},
      onGameOver: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-discrete-option-multi-choice-main');

    this.answerOptionsParams = Globals.get('params').answerOptions;
    this.mode = Globals.get('params').behaviour.mode;

    this.currentPanelIndex = 0; // TODO: Previous state
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Handle user answered true/false for an option.
   *
   * @param {number} index Index of the option.
   * @param {boolean} userAnswer Answer given by user.
   * @param {number} [userWeight=1] Weight of user answer, [0...1].
   */
  handleAnswered(index, userAnswer, userWeight = 1) {
    this.panelList.disablePanel(this.currentPanelIndex);

    this.answerOptions[index].userAnswer = userAnswer;

    let scoreDelta = 0;

    if (this.answerOptions[index].correct !== userAnswer) {
      scoreDelta = -1 * userWeight;
    }
    else if (this.answerOptions[index].correct) {
      scoreDelta = 1 * userWeight;
    }

    this.callbacks.onAnswerGiven(scoreDelta);

    if (
      this.currentPanelIndex >= this.answerOptions.length - 1 ||
      this.mode === 'standard' && this.isOvertime
    ) {
      // Award 1 point if all answer options are wrong and none was chosen
      if (
        this.mode !== 'standard' &&
        this.answerOptions.every((option) => {
          return option.correct === option.userAnswer && !option.correct;
        })
      ) {
        this.callbacks.onAnswerGiven(1);
      }

      this.callbacks.onGameOver(); // Nothing more to show
      return;
    }

    // Check whether continuing is possible in standard mode
    if (this.mode === 'standard') {
      if (scoreDelta < 0) {
        this.callbacks.onGameOver(); // Wrong answer
        return;
      }

      // Randomly add one more option on correct answer to distract
      if (scoreDelta === 1 && Math.random() < 0.5) {
        this.callbacks.onGameOver(); // Done
        return;
      }

      if (scoreDelta === 1) {
        this.isOvertime = true;
      }
    }

    // Show next option
    this.currentPanelIndex++;
    this.panelList.attachOption(this.currentPanelIndex);
  }

  /**
   * Show results.
   *
   * @param {object} [params={}] Parameters.
   */
  showResults(params = {}) {
    this.scorePoints = this.scorePoints || new H5P.Question.ScorePoints();
    this.panelList.showResults(
      params.showScores ? this.scorePoints : null
    );
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.panelList.showSolutions();
  }

  /**
   * Reset.
   */
  reset() {
    this.dom.innerHTML = '';

    this.currentPanelIndex = 0;
    this.isOvertime = false;

    // Set order of answer options
    this.order = [...Array(this.answerOptionsParams.length).keys()];
    if (Globals.get('params').behaviour.randomAnswers) {
      this.order = Util.shuffleArray(this.order);
    }

    this.answerOptions = [];
    this.order.forEach((index) => {
      const option = this.answerOptionsParams[index];
      option.userAnswer = null;

      this.answerOptions.push(option);
    });

    this.panelList = new PanelList(
      {
        options: this.answerOptions
      },
      {
        onAnswered: (id, score) => {
          this.handleAnswered(id, score);
        }
      }
    );
    this.panelList.reset();

    this.dom.append(this.panelList.getDOM());
  }
}

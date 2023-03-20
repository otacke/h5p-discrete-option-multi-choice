import Dictionary from '@services/dictionary';
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
    this.confidenceLevels = Globals.get('params').behaviour.confidenceLevels
      .split(',')
      .map((level) => parseInt(level) / 100);

    this.currentPanelIndex = 0;
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
   * Handle user changed confidence.
   *
   * @param {number} index Index of confidence level.
   * @param {boolean} confidenceIndex Index of confidence.
   */
  handleConfidenceChanged(index, confidenceIndex) {
    this.answerOptions[index].confidenceIndex = confidenceIndex;
  }

  /**
   * Handle user answered true/false for an option.
   *
   * @param {number} index Index of the option.
   * @param {boolean} userAnswer Answer given by user.
   */
  handleAnswered(index, userAnswer) {
    this.panelList.disablePanel(this.currentPanelIndex);

    const confidence = (this.mode === 'allOptionsWeighted') ?
      this.confidenceLevels[this.answerOptions[index].confidenceIndex] :
      1;

    this.answerOptions[index].userAnswer = userAnswer;
    this.answerOptions[index].isOvertime = this.isOvertime ?? false;

    let scoreDelta = 0;

    if (this.isOvertime) {
      scoreDelta = 0;
    }
    else if (this.answerOptions[index].correct !== userAnswer) {
      scoreDelta = -1 * confidence;
    }
    else if (this.answerOptions[index].correct) {
      scoreDelta = 1 * confidence;
    }
    else if (this.mode !== 'standard') {
      scoreDelta = 1 * confidence;
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
    this.panelList.disableAll();
    this.panelList.showSolutions();
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

    this.dom.innerHTML = '';

    this.currentPanelIndex = 0;

    this.isOvertime = false;

    const behavior = Globals.get('params').behaviour;

    // Set order of answer options
    this.order = params.previousState.order ??
      [...Array(this.answerOptionsParams.length).keys()];

    if (behavior.randomAnswers && !params.previousState.order) {
      this.order = Util.shuffleArray(this.order);
    }

    // Build selector parameters
    let selector = null;
    if (behavior.mode === 'allOptionsWeighted') {
      const values = behavior.confidenceLevels
        .split(',')
        .map((value) => `${value.trim()}&nbsp;%`);

      const labels = values.map((value) => {
        return Dictionary.get('l10n.confidence').replace(/@percent/g, value);
      });

      selector = { options: [] };
      for (let i = 0; i < values.length; i++) {
        selector.options.push({
          value: values[i],
          label: labels?.[i] ?? values[i]
        });
      }
    }

    this.answerOptions = [];

    this.order.forEach((position, index) => {
      const option = this.answerOptionsParams[position];

      option.userAnswer =
        params.previousState.answers?.[index].userAnswer ?? null;

      option.confidenceIndex =
        params.previousState.answers?.[index].confidenceIndex ?? 0;

      option.selector = selector;

      this.answerOptions.push(option);
    });

    this.panelList = new PanelList(
      {
        options: this.answerOptions
      },
      {
        onAnswered: (index, score) => {
          this.handleAnswered(index, score);
        },
        onConfidenceChanged: (index, confidenceIndex) => {
          this.handleConfidenceChanged(index, confidenceIndex);
        }
      }
    );

    this.panelList.reset({ previousState: params.previousState.answers });

    // Re-create previous user answers
    if (params.previousState.answers) {
      params.previousState.answers.forEach((answer, index) => {
        if (typeof answer.userAnswer === 'boolean') {
          this.handleAnswered(index, answer.userAnswer);
        }
      });
    }

    this.dom.append(this.panelList.getDOM());
  }


  /**
   * Get current state.
   *
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      order: this.order,
      answers: this.answerOptions.map((option) => {
        return ({
          userAnswer: option.userAnswer,
          confidenceIndex: option.confidenceIndex
        });
      }),
      isOvertime: this.isOvertime
    };
  }

  /**
   * Get all options up to the first correct one.
   *
   * @returns {object[]} Scored answer options.
   */
  getScoredAnswerOptions() {
    let scoredOptions = [...this.answerOptions];

    if (this.mode === 'standard') {
      scoredOptions = scoredOptions.reduce((selection, option) => {
        if (selection.length && selection[selection.length - 1].correct) {
          return selection;
        }

        selection.push(option);

        return selection;
      }, []);
    }

    return scoredOptions;
  }

  /**
   * Get user response for xAPI statement.
   *
   * @returns {string} User response for xAPI statement.
   */
  getXAPIResponse() {
    return this.getScoredAnswerOptions()
      .map((option, index) => {
        if ((option.userAnswer === true)) {
          return 2 * index;
        }

        if ((option.userAnswer === false)) {
          return 2 * index + 1;
        }

        return null;
      })
      .filter((response) => response !== null)
      .join('[,]');
  }

  /**
   * Get choices for xAPI statement.
   *
   * @returns {object[]} Choices for xAPI statement.
   */
  getXAPIChoices() {
    return this.getScoredAnswerOptions()
      .reduce((choices, choice, index) => {
        choices.push(
          {
            id: (index * 2).toString(),
            description: {
              'en-US': `${Util.stripHTML(choice.text)} (@correct)`
            }
          },
          {
            id: (index * 2 + 1).toString(),
            description: {
              'en-US': `${Util.stripHTML(choice.text)} (@incorrect)`
            }
          }
        );

        return choices;
      }, []);
  }

  /**
   * Get correct responses pattern for xAPI.
   *
   * @returns {string[]} Correct responses pattern.
   */
  getXAPICorrectResponsesPattern() {
    return [
      this.getScoredAnswerOptions()
        .reduce((correct, option, index) => {
          if (option.correct) {
            correct.push((2 * index).toString());
          }
          else {
            correct.push((2 * index + 1).toString());
          }

          return correct;
        }, [])
        .join('[,]')
    ];
  }
}

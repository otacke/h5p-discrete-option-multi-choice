import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Globals from '@services/globals';
import Main from '@components/main';
import '@styles/h5p-discrete-option-multi-choice.scss';

export default class DiscreteOptionMultiChoice extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('discrete-option-multi-choice');

    // Sanitize parameters
    this.params = Util.extend({
      behaviour: {
        enableRetry: true, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
        enableSolutionsButton: false, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
        enableCheckButton: false, // Undocumented in contract, but required for Question Set
        mode: 'standard',
        showResults: false,
        randomAnswers: true,
        singlePoint: false,
        confidenceLevels: '100,50,0'
      },
      answers: [],
      l10n: {
        check: 'Check',
        submit: 'Submit',
        showSolution: 'Show solution',
        retry: 'Retry',
        confidence: 'I am @percent sure.'
      },
      a11y: {
        check: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
        showSolution: 'Show the solution. The task will be marked with its correct solution.',
        retry: 'Retry the task. Reset all responses and start the task over again.',
        yourResult: 'You got @score out of @total points'
      }
    }, params);

    // Ensure values match what discrete option multiple choice is for
    if (this.params.behaviour.mode === 'standard') {
      this.params.behaviour.randomAnswers = true;
      this.params.behaviour.singlePoint = true;
    }

    this.contentId = contentId;
    this.extras = extras;

    // Fill dictionary
    Dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    // Set globals
    Globals.set('params', this.params);
    Globals.set('resize', () => {
      this.trigger('resize');
    });

    this.previousState = extras?.previousState || {};

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Build content
    this.content = new Main(
      {},
      {
        onAnswerGiven: (scoreDelta) => {
          this.handleAnswerGiven(scoreDelta);
        },
        onGameOver: () => {
          this.handleGameOver();
        }
      }
    );

    this.resetTask();
  }

  /**
   * Register the DOM elements with H5P.Question.
   */
  registerDomElements() {
    // Set optional media
    const media = this.params.media.type;
    if (media && media.library) {
      const type = media.library.split(' ')[0];
      // Image
      if (type === 'H5P.Image') {
        if (media.params.file) {
          this.setImage(media.params.file.path, {
            disableImageZooming: this.params.media.disableImageZooming,
            alt: media.params.alt,
            title: media.params.title
          });
        }
      }
      // Video
      else if (type === 'H5P.Video') {
        if (media.params.sources) {
          this.setVideo(media);
        }
      }
      // Audio
      else if (type === 'H5P.Audio') {
        if (media.params.files) {
          this.setAudio(media);
        }
      }
    }

    // Register task introduction text
    if (this.params.question) {
      this.introduction = document.createElement('div');
      this.introduction.innerHTML = this.params.question;
      this.setIntroduction(this.introduction);
    }

    // Register content
    this.setContent(this.content.getDOM());
    this.addButtons();
  }

  /**
   * Add all buttons for H5P.Question.
   */
  addButtons() {
    // Just to ensure that H5P.QuestionSet finds one - may not be necessary
    this.addButton(
      'check-answer',
      Dictionary.get('l10n.check'),
      () => {},
      this.params.behaviour.enableCheckButton,
      { 'aria-label': Dictionary.get('a11y.check') },
      {
        contentData: this.contentData,
        textIfSubmitting: Dictionary.get('l10n.submit'),
      }
    );

    this.addButton(
      'show-solution',
      Dictionary.get('l10n.showSolution'),
      () => {
        this.handleShowSolutions();
      },
      false,
      { 'aria-label': Dictionary.get('a11y.showSolution') },
      {}
    );

    this.addButton(
      'try-again',
      Dictionary.get('l10n.retry'),
      () => {
        this.handleRetry();
      },
      false,
      { 'aria-label': Dictionary.get('a11y.retry') },
      {}
    );
  }

  /**
   * Handle click on 'Show solutions' button.
   */
  handleShowSolutions() {
    this.hideButton('show-solution');
    this.content.showSolutions();
  }

  /**
   * Handle click on 'Retry' button.
   */
  handleRetry() {
    this.resetTask();
  }

  /**
   * Handle user gave answer.
   *
   * @param {number} scoreDelta Score difference caused by answer.
   */
  handleAnswerGiven(scoreDelta) {
    if (this.params.behaviour.singlePoint) {
      if (this.score === -1 || scoreDelta < 0) {
        this.score = -1;
      }
      else {
        this.score = 1;
      }
    }
    else {
      this.score = this.score + scoreDelta;
    }

    this.wasAnswerGiven = true;
    this.triggerXAPI('interacted');
  }

  /**
   * Handle game over.
   */
  handleGameOver() {
    if (this.params.behaviour.enableSolutionsButton) {
      this.showButton('show-solution');
    }

    if (this.params.behaviour.enableRetry) {
      this.showButton('try-again');
    }

    const textScore = H5P.Question.determineOverallFeedback(
      this.params.overallFeedback, this.getScore() / this.getMaxScore()
    );

    // H5P.Question expects ':num' and ':total'
    const ariaMessage = this.params.a11y.yourResult
      .replace('@score', ':num')
      .replace('@total', ':total');

    this.setFeedback(
      textScore,
      this.getScore(),
      this.getMaxScore(),
      ariaMessage
    );

    if (this.params.behaviour.showResults) {
      const showScores = this.params.behaviour.mode === 'allOptions' &&
        !this.params.behaviour.singlePoint;

      this.content.showResults({ showScores: showScores });
    }
  }

  /**
   * Check if result has been submitted or input has been given.
   *
   * @returns {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.wasAnswerGiven;
  }

  /**
   * Get latest score.
   *
   * @returns {number} latest score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    return Math.max(0, Math.min(this.score, this.getMaxScore()));
  }

  /**
   * Get maximum possible score.
   *
   * @returns {number} Score necessary for mastering.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    if (
      this.params.behaviour.mode === 'standard' ||
      this.params.behaviour.singlePoint
    ) {
      return 1;
    }

    const correctAnswersCount = this.params.answerOptions.length;

    // If no answer is marked as correct, we still need 1 at least.
    return Math.max(1, correctAnswersCount);
  }

  /**
   * Show solutions.
   *
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    // TODO
  }

  /**
   * Reset task.
   *
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.score = 0;
    this.wasAnswerGiven = false;

    this.content.reset();

    this.removeFeedback();
    this.hideButton('show-solution');
    this.hideButton('try-again');

    this.trigger('resize');
  }

  /**
   * Get xAPI data.
   *
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    return { statement: {} }; // TODO
  }

  /**
   * Answer call to return the current state.
   *
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {}; // TODO;
  }

  /**
   * Get task title.
   *
   * @returns {string} Title.
   */
  getTitle() {
    return H5P.createTitle(
      this.extras?.metadata?.title ||
      DiscreteOptionMultiChoice.DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   *
   * @returns {string} Description.
   */
  getDescription() {
    return DiscreteOptionMultiChoice.DEFAULT_DESCRIPTION;
  }
}

/** @constant {string} DEFAULT_DESCRIPTION Default description */
DiscreteOptionMultiChoice.DEFAULT_DESCRIPTION = 'Discrete Option Multiple Choice';

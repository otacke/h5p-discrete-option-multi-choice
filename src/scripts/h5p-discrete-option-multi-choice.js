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
        oneItemAtATime: true,
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
        confidence: 'I am @percent sure.',
        yourResults: 'Your results'
      },
      a11y: {
        check: 'Check the answers. The responses will be marked as correct, incorrect, or unanswered.',
        showSolution: 'Show the solution. The task will be marked with its correct solution.',
        retry: 'Retry the task. Reset all responses and start the task over again.',
        yourResult: 'You got @score out of @total points',
        taskConfidenceMark: 'Choose your confidence and mark as correct or incorrect',
        taskMark: 'Mark as correct or incorrect',
        markAnswerAs: 'Mark answer as @status',
        correct: 'correct',
        incorrect: 'incorrect',
        panelNotExpandable: 'This item can currently not be expanded.',
        panelAdded: 'Showing next answer option: @option',
        allAnswered: 'There are no more answer options to mark.',
        youMarkedThisAs: 'You marked this as @correctness',
        confidenceAt: 'Confidence: @value',
        yourAnswerWas: 'Your answer was @correctness',
        correctAnswerWas: 'The correct answer was to mark this as @correctness'
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
    Globals.set('read', (text) => {
      this.read(text);
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
        onGameOver: (params) => {
          this.handleGameOver(params);
        }
      }
    );
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

    this.reset({ previousState: this.previousState.content ?? {} });

    if (
      this.previousState.viewState ===
      DiscreteOptionMultiChoice.VIEW_STATES['results'] &&
      this.viewState !== DiscreteOptionMultiChoice.VIEW_STATES['results']
    ) {
      this.handleGameOver({ skipXAPI: true });
    }
    else if (
      this.previousState.viewState ===
      DiscreteOptionMultiChoice.VIEW_STATES['solutions']
    ) {
      this.handleGameOver({ skipXAPI: true });
      this.handleShowSolutions();
    }
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
    this.setViewState('solutions');
    this.hideButton('show-solution');
    this.content.showSolutions();

    this.content.focusPanel(0);
  }

  /**
   * Handle click on 'Retry' button.
   */
  handleRetry() {
    this.reset({ focus: true });
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
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.skipXAPI] If true, skip xapi.
   * @param {boolean} [params.quiet=true] If false, announce game over.
   */
  handleGameOver(params = {}) {
    if (!params.quiet) {
      this.read(Dictionary.get('a11y.allAnswered'));
    }

    this.setViewState('results');

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
    else if (
      Globals.get('params').behaviour.oneItemAtATime &&
      !params.skipXAPI // Re-creating state, so not required again
    ) {
      this.content.appendResultsMessage();
    }

    this.content.showFeedback();

    window.setTimeout(() => {
      this.content.focusPanel(0);
    }, 50); // Give time to read results

    if (!params.skipXAPI) {
      this.triggerXAPIEvent('answered');
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
    return Math.round(Math.max(0, Math.min(this.score, this.getMaxScore())));
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
    this.hideButton('show-solution');
    this.hideButton('try-again');

    this.content.showAllPanels();
    this.content.showFeedback();
    this.content.showSolutions();
  }

  /**
   * Reset.
   *
   * @param {object} [params={}] Parameters.
   */
  reset(params = {}) {
    this.score = 0;
    this.wasAnswerGiven = false;

    this.content.reset({
      previousState: params.previousState ?? {},
      focus: params.focus ?? false
    });

    this.removeFeedback();
    this.hideButton('show-solution');
    this.hideButton('try-again');

    this.setViewState('task');

    this.trigger('resize');
  }

  /**
   * Reset task.
   *
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.reset({ focus: true });
  }

  /**
   * Get xAPI data.
   *
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEvent('answered');

    return { statement: xAPIEvent.data.statement };
  }

  /**
   * Answer call to return the current state.
   *
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      content: this.content.getCurrentState(),
      viewState: this.viewState
    };
  }

  /**
   * Trigger xAPI event.
   *
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   *
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition()
    );

    if (verb === 'completed' || verb === 'answered') {
      xAPIEvent.setScoredResult(
        this.getScore(),
        this.getMaxScore(),
        this,
        true,
        this.getScore() === this.getMaxScore()
      );

      xAPIEvent.data.statement.result.response = this.content.getXAPIResponse();
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   *
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = this.getDescription();
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'choice';

    definition.choices = this.content.getXAPIChoices();

    if (this.languageTag !== 'en-US') {
      definition.choices = definition.choices.map((choice) => {
        choice.description[this.languageTag] = choice.description['en-US'];

        choice.description['en-US'] =
          choice.description['en-US']
            .replace(/@correct/, 'correct')
            .replace(/@incorrect/, 'incorrect');

        choice.description[this.languageTag] =
          choice.description[this.languageTag]
            .replace(/@correct/, Dictionary.get('a11y.correct'))
            .replace(/@incorrect/, Dictionary.get('a11y.incorrect'));

        return choice;
      });
    }

    definition.correctResponsesPattern =
       this.content.getXAPICorrectResponsesPattern();

    return definition;
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

  /**
   * Set view state.
   *
   * @param {string|number} state State to be set.
   */
  setViewState(state) {
    if (
      typeof state === 'string' &&
      DiscreteOptionMultiChoice.VIEW_STATES[state] !== undefined
    ) {
      this.viewState = DiscreteOptionMultiChoice.VIEW_STATES[state];
    }
    else if (
      typeof state === 'number' &&
      Object.values(DiscreteOptionMultiChoice.VIEW_STATES).includes(state)
    ) {
      this.viewState = state;

      this.content.setViewState(
        DiscreteOptionMultiChoice.VIEW_STATES
          .find((value) => value === state)
          .keys[0]
      );
    }
  }
}

/** @constant {string} DEFAULT_DESCRIPTION Default description */
DiscreteOptionMultiChoice.DEFAULT_DESCRIPTION =
  'Discrete Option Multiple Choice';

/** @constant {object} view states */
DiscreteOptionMultiChoice.VIEW_STATES = { task: 0, results: 1, solutions: 2 };

// Copyright 2022 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Component for the pencil code editor interaction.
 *
 * IMPORTANT NOTE: The naming convention for customization args that are passed
 * into the directive is: the name of the parameter, followed by 'With',
 * followed by the name of the arg.
 */

import {downgradeComponent} from '@angular/upgrade/static';
import {Component, Input, OnDestroy, OnInit, ElementRef} from '@angular/core';
import {CurrentInteractionService} from 'pages/exploration-player-page/services/current-interaction.service';
import {FocusManagerService} from 'services/stateful/focus-manager.service';
import {InteractionAttributesExtractorService} from 'interactions/interaction-attributes-extractor.service';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {PencilCodeEditorCustomizationArgs} from 'interactions/customization-args-defs';
import {PencilCodeEditorRulesService} from './pencil-code-editor-rules.service';
import {PencilCodeResetConfirmation} from './pencil-code-reset-confirmation.component';
import {PlayerPositionService} from 'pages/exploration-player-page/services/player-position.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'oppia-interactive-pencil-code-editor',
  templateUrl: './pencil-code-editor-interaction.component.html',
})
export class PencilCodeEditor implements OnInit, OnDestroy {
  @Input() set lastAnswer(value: {code: string} | null) {
    this._lastAnswer = value || {code: ''};
  }
  get lastAnswer(): {code: string} {
    return this._lastAnswer;
  }

  @Input() initialCodeWithValue: string = '';

  private _lastAnswer: {code: string} = {code: ''};
  iframeDiv!: NodeListOf<Element>;
  pce!: PencilCodeEmbed;
  someInitialCode: string = '';
  interactionIsActive: boolean = false;
  directiveSubscriptions = new Subscription();
  private errorIsHappening: boolean = false;
  private hasSubmittedAnswer: boolean = false;

  constructor(
    private currentInteractionService: CurrentInteractionService,
    private elementRef: ElementRef,
    private focusManagerService: FocusManagerService,
    private interactionAttributesExtractorService: InteractionAttributesExtractorService,
    private ngbModal: NgbModal,
    private playerPositionService: PlayerPositionService,
    private pencilCodeEditorRulesService: PencilCodeEditorRulesService
  ) {}

  private _getAttributes() {
    return {
      initialCodeWithValue: this.initialCodeWithValue,
    };
  }

  reset(): void {
    this.ngbModal
      .open(PencilCodeResetConfirmation, {
        backdrop: 'static',
        keyboard: false,
      })
      .result.then(
        () => {
          this.pce.setCode(this.someInitialCode);
        },
        () => {
          // Note to developers:
          // This callback is triggered when the Cancel button is clicked.
          // No further action is needed.
        }
      );
  }

  getNormalizedCode(): string {
    // Converts tabs to spaces.
    return this.pce.getCode().replace(/\t/g, '  ');
  }

  submitAnswer(): void {
    if (!this.interactionIsActive || !this.isValid()) {
      return;
    }

    let normalizedCode = this.getNormalizedCode();

    if (this.errorIsHappening || this.hasSubmittedAnswer) {
      return;
    }

    this.pce.eval(
      'document.body.innerHTML',
      (pencilCodeHtml: string) => {
        // Get all the divs, and extract their textual content.
        let temp = document.createElement('div');
        temp.innerHTML = pencilCodeHtml;
        let output: string = '';
        let htmlObject = temp.querySelectorAll('div');
        for (let i = 0; i < htmlObject.length; i++) {
          output += htmlObject[i].innerHTML + '\n';
        }

        this.hasSubmittedAnswer = true;
        this.currentInteractionService.onSubmit(
          {
            code: normalizedCode,
            output: output || '',
            evaluation: '',
            error: '',
          },
          this.pencilCodeEditorRulesService
        );
      },
      true
    );
  }

  isValid(): boolean {
    return (
      this.pce &&
      this.pce.getCode &&
      typeof this.pce.getCode === 'function' &&
      this.pce.getCode().trim().length > 0
    );
  }

  ngOnInit(): void {
    this.directiveSubscriptions.add(
      this.playerPositionService.onNewCardAvailable.subscribe(() => {
        this.interactionIsActive = false;
        this.pce.hideMiddleButton();
        this.pce.hideToggleButton();
        this.pce.setReadOnly();
      })
    );

    this.iframeDiv = this.elementRef.nativeElement.querySelectorAll(
      '.pencil-code-editor-iframe'
    );

    this.pce = new PencilCodeEmbed(this.iframeDiv[0]);

    const {initialCode} =
      this.interactionAttributesExtractorService.getValuesFromAttributes(
        'PencilCodeEditor',
        this._getAttributes()
      ) as PencilCodeEditorCustomizationArgs;

    if (!this._lastAnswer) {
      this._lastAnswer = {code: initialCode.value};
    }

    this.interactionIsActive = !this._lastAnswer.code;
    this.someInitialCode = this.interactionIsActive
      ? initialCode.value
      : this._lastAnswer.code;

    this.pce.beginLoad(this.someInitialCode);

    this.pce.on('load', () => {
      // Hides the error console at the bottom right, and prevents it
      // from showing up even if the code has an error. Also, hides the
      // turtle, and redefines say() to also write the text on the
      // screen.
      this.pce.setupScript([
        {
          code: `window.onerror = function() { return true; };
                 debug.hide();
                 window.removeEventListener("error", debug);
                 ht();
                 oldsay = window.say;
                 say = function(x) { write(x); oldsay(x); };`,
          type: 'text/javascript',
        },
      ]);

      this.pce.showEditor();
      this.pce.hideToggleButton();
      if (this.interactionIsActive) {
        this.pce.setEditable();
      } else {
        this.pce.hideMiddleButton();
        this.pce.setReadOnly();
      }

      // Pencil Code automatically takes the focus on load, so we clear
      // it.
      this.focusManagerService.clearFocus();
    });

    this.pce.on('startExecute', () => {
      this.hasSubmittedAnswer = false;
    });

    this.pce.on('execute', () => {
      if (this.errorIsHappening || this.hasSubmittedAnswer) {
        return;
      }
      this.submitAnswer();
    });

    this.pce.on('error', (error: {message: string}) => {
      if (this.hasSubmittedAnswer) {
        return;
      }
      let normalizedCode = this.getNormalizedCode();

      this.errorIsHappening = true;
      this.hasSubmittedAnswer = true;

      this.currentInteractionService.onSubmit(
        {
          code: normalizedCode,
          output: '',
          evaluation: '',
          error: error.message,
        },
        this.pencilCodeEditorRulesService
      );

      setTimeout(() => {
        this.errorIsHappening = false;
      }, 1000);
    });

    // Register the interaction with submit function and validation
    this.currentInteractionService.registerCurrentInteraction(
      () => this.submitAnswer(),
      () => this.isValid()
    );
  }

  ngOnDestroy(): void {
    this.directiveSubscriptions.unsubscribe();
  }
}

angular.module('oppia').directive(
  'oppiaInteractivePencilCodeEditor',
  downgradeComponent({
    component: PencilCodeEditor,
  }) as angular.IDirectiveFactory
);

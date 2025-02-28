// Copyright 2014 The Oppia Authors. All Rights Reserved.
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
 * @fileoverview Utility service for language operations.
 */

import {Injectable} from '@angular/core';

import {AudioLanguage} from 'domain/utilities/audio-language.model';
import {
  AutogeneratedAudioLanguage,
  AutogeneratedAudioLanguageDict,
} from 'domain/utilities/autogenerated-audio-language.model';
import {BrowserCheckerService} from 'domain/utilities/browser-checker.service';

import {AppConstants} from 'app.constants';

interface SupportedAudioLanguagesDict {
  [language: string]: AudioLanguage;
}

interface SupportedContentLanguagesDict {
  [language: string]: ContentLanguage;
}

interface AutogeneratedAudioLanguagesByType {
  [language: string]: AutogeneratedAudioLanguage;
}

interface SupportedAudioLanguageBackendDict {
  id: string;
  description: string;
  relatedLanguages: readonly string[];
  direction: string;
}

interface SupportedContentLanguageBackendDict {
  code: string;
  description: string;
  direction: string;
  ariaLabelInEnglish: string;
}

export interface LanguageIdAndText {
  id: string;
  text: string;
  ariaLabelInEnglish: string;
}

interface ContentLanguage {
  code: string;
  description: string;
  direction: string;
  ariaLabelInEnglish: string;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageUtilService {
  get SUPPORTED_AUDIO_LANGUAGES(): readonly SupportedAudioLanguageBackendDict[] {
    return AppConstants.SUPPORTED_AUDIO_LANGUAGES;
  }

  get AUTOGENERATED_AUDIO_LANGUAGES(): readonly AutogeneratedAudioLanguageDict[] {
    return AppConstants.AUTOGENERATED_AUDIO_LANGUAGES;
  }

  get SUPPORTED_CONTENT_LANGUAGES(): readonly SupportedContentLanguageBackendDict[] {
    return AppConstants.SUPPORTED_CONTENT_LANGUAGES;
  }

  constructor(private browserChecker: BrowserCheckerService) {}

  getSupportedAudioLanguages(): SupportedAudioLanguagesDict {
    var supportedAudioLanguages: SupportedAudioLanguagesDict = {};
    this.SUPPORTED_AUDIO_LANGUAGES.forEach(audioLanguageDict => {
      supportedAudioLanguages[audioLanguageDict.id] =
        AudioLanguage.createFromDict(audioLanguageDict);
    });
    return supportedAudioLanguages;
  }

  getSupportedContentLanguages(): SupportedContentLanguagesDict {
    const supportedContentLanguages: SupportedContentLanguagesDict = {};
    this.SUPPORTED_CONTENT_LANGUAGES.forEach(contentLanguageDict => {
      supportedContentLanguages[contentLanguageDict.code] = contentLanguageDict;
    });
    return supportedContentLanguages;
  }

  getAllAudioLanguageCodes(): string[] {
    var allAudioLanguageCodes = this.SUPPORTED_AUDIO_LANGUAGES.map(
      audioLanguage => {
        return audioLanguage.id;
      }
    );
    return allAudioLanguageCodes;
  }

  getAutogeneratedAudioLanguages(
    type: string
  ): AutogeneratedAudioLanguagesByType {
    var autogeneratedAudioLanguagesByType: AutogeneratedAudioLanguagesByType =
      {};
    this.AUTOGENERATED_AUDIO_LANGUAGES.forEach(
      autogeneratedAudioLanguageDict => {
        var autogeneratedAudioLanguage =
          AutogeneratedAudioLanguage.createFromDict(
            autogeneratedAudioLanguageDict
          );

        if (type === 'exp-lang-code') {
          autogeneratedAudioLanguagesByType[
            autogeneratedAudioLanguage.explorationLanguage
          ] = autogeneratedAudioLanguage;
        } else if (type === 'autogen-lang-code') {
          autogeneratedAudioLanguagesByType[autogeneratedAudioLanguage.id] =
            autogeneratedAudioLanguage;
        } else {
          throw new Error('Invalid type: ' + type);
        }
      }
    );
    return autogeneratedAudioLanguagesByType;
  }

  getShortLanguageDescription(fullLanguageDescription: string): string {
    var ind = fullLanguageDescription.indexOf(' (');
    if (ind === -1) {
      return fullLanguageDescription;
    } else {
      return fullLanguageDescription.substring(0, ind);
    }
  }

  getLanguageIdsAndTexts(): LanguageIdAndText[] {
    var languageIdsAndTexts = this.SUPPORTED_CONTENT_LANGUAGES.map(
      (languageItem: ContentLanguage) => {
        return {
          id: languageItem.code,
          text: this.getShortLanguageDescription(languageItem.description),
          ariaLabelInEnglish: languageItem.ariaLabelInEnglish,
        };
      }
    );
    return languageIdsAndTexts;
  }

  getAudioLanguagesCount(): number {
    return this.getAllAudioLanguageCodes().length;
  }

  getAllVoiceoverLanguageCodes(): string[] {
    return this.getAllAudioLanguageCodes();
  }

  getAudioLanguageDescription(audioLanguageCode: string): string {
    const language = this.getSupportedAudioLanguages()[audioLanguageCode];
    return language.description;
  }

  getLanguageDirection(languageCode: string): string {
    // The backend constants tests guarantee that SUPPORTED_CONTENT_LANGUAGES
    // and SUPPORTED_AUDIO_LANGUAGES do not conflict and contain at most one
    // entry per language code.
    const matchingContentLanguage = this.SUPPORTED_CONTENT_LANGUAGES.find(
      language => language.code === languageCode
    );
    if (matchingContentLanguage !== undefined) {
      return matchingContentLanguage.direction;
    }

    const matchingAudioLanguage = this.SUPPORTED_AUDIO_LANGUAGES.find(
      language => language.id === languageCode
    );
    if (matchingAudioLanguage !== undefined) {
      return matchingAudioLanguage.direction;
    }
    throw new Error(
      'Could not find language direction for the supplied language code: ' +
        languageCode
    );
  }

  getContentLanguageDescription(contentLanguageCode: string): string | null {
    const language = this.getSupportedContentLanguages()[contentLanguageCode];
    return language ? language.description : null;
  }

  // Given a list of audio language codes, returns the complement list, i.e.
  // the list of audio language codes not in the input list.
  getComplementAudioLanguageCodes(audioLanguageCodes: string[]): string[] {
    return this.getAllAudioLanguageCodes().filter(languageCode => {
      return audioLanguageCodes.indexOf(languageCode) === -1;
    });
  }

  getLanguageCodesRelatedToAudioLanguageCode(
    audioLanguageCode: string
  ): readonly string[] {
    return this.getSupportedAudioLanguages()[audioLanguageCode]
      .relatedLanguages;
  }

  supportsAutogeneratedAudio(explorationLanguageCode: string): boolean {
    return (
      this.browserChecker.supportsSpeechSynthesis() &&
      this.getAutogeneratedAudioLanguages('exp-lang-code').hasOwnProperty(
        explorationLanguageCode
      )
    );
  }

  isAutogeneratedAudioLanguage(audioLanguageCode: string): boolean {
    return this.getAutogeneratedAudioLanguages(
      'autogen-lang-code'
    ).hasOwnProperty(audioLanguageCode);
  }

  getAutogeneratedAudioLanguage(
    explorationLanguageCode: string
  ): AutogeneratedAudioLanguage {
    return this.getAutogeneratedAudioLanguages('exp-lang-code')[
      explorationLanguageCode
    ];
  }
}

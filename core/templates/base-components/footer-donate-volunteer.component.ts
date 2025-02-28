// Copyright 2023 The Oppia Authors. All Rights Reserved.
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
 * @fileoverview Component for the donate volunteer links in the footer.
 */

import {Component, ViewEncapsulation} from '@angular/core';
import {WindowRef} from 'services/contextual/window-ref.service';
import {SiteAnalyticsService} from 'services/site-analytics.service';
import {NavbarAndFooterGATrackingPages} from 'app.constants';

@Component({
  selector: 'oppia-footer-donate-volunteer',
  templateUrl: './footer-donate-volunteer.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FooterDonateVolunteerComponent {
  constructor(
    private windowRef: WindowRef,
    private siteAnalyticsService: SiteAnalyticsService
  ) {}

  navigateToVolunteerPage(): void {
    this.siteAnalyticsService.registerClickFooterButtonEvent(
      NavbarAndFooterGATrackingPages.VOLUNTEER
    );
    this.windowRef.nativeWindow.location.href = '/volunteer';
  }
}

"use strict";
const Homey = require("homey");
const generatedScreensavers = require("./assets/json/generated-screensavers.json");
const { sleep, getDifference } = require('./lib/helpers');

const _settingsKey = `${Homey.manifest.id}.settings`;

let currentLang = 'en';

class App extends Homey.App {
  async onInit() {
    this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

    const getLanguage = this.homey.i18n.getLanguage();

    currentLang = getLanguage === 'nl' ? 'nl' : 'en';

    await this.initSettings();
    await this.initScreenSavers();
  }

  async initSettings() {
    try {
      let settingsInitialized = false;
      this.homey.settings.getKeys().forEach((key) => {
        if (key == _settingsKey) {
          settingsInitialized = true;
        }
      });
      

      if (settingsInitialized) {
        this.log("initSettings - Found settings key", _settingsKey);
        this.appSettings = this.homey.settings.get(_settingsKey);

        if(this.appSettings.SCREENSAVERS.length < this.homey.manifest.screensavers.length) {
            this.log(`[InitSettings] - Adding extra screensavers`);
        
            const newScreensavers = [
                ...getDifference(this.appSettings.SCREENSAVERS, this.homey.manifest.screensavers),
                ...getDifference(this.homey.manifest.screensavers, this.appSettings.SCREENSAVERS)
            ];
       
            this.appSettings.SCREENSAVERS = [...this.appSettings.SCREENSAVERS, ...newScreensavers];
            this.log(`[InitSettings] - Added`, newScreensavers);
        }


        this.appSettings = {...this.appSettings, LANGUAGE: currentLang};
        this.log(`[InitSettings] - Set language to`, currentLang);

        if (this.appSettings) {
          this.saveSettings();
        }

        return;
      }

      this.log(`Initializing ${_settingsKey} with defaults`);
      this.updateSettings({ SCREENSAVERS: this.homey.manifest.screensavers, LANGUAGE: currentLang }, false);
    } catch (err) {
      this.error(err);
    }
  }

  updateSettings(settings, restart = true) {
    this.log("updateSettings - New settings:", {...settings, SCREENSAVERS: []});
    console.dir(settings.SCREENSAVERS, {'maxArrayLength': null})
    this.appSettings = settings;
    this.saveSettings();

    if (restart) {
      this.log("Restart the app.");
    }
  }

  saveSettings() {
    if (typeof this.appSettings === "undefined") {
      this.log("Not saving settings; settings empty!");
      return;
    }

    this.log("Saved settings.");
    this.homey.settings.set(_settingsKey, this.appSettings);
  }

  initScreenSavers() {
    generatedScreensavers.sort((a, b) => a.title[currentLang].localeCompare(b.title[currentLang])).forEach(async (screensaver) => {
      const matchedScreensaver = this.appSettings.SCREENSAVERS.find(
        (s) => s.name === screensaver.id
      );

      if (matchedScreensaver && matchedScreensaver.enabled) {
        this.log(`Registering: ${screensaver.id}`);

        let animation = await this.homey.ledring.createAnimation(screensaver);

        await sleep(1000);
        await await this.homey.ledring.registerScreensaver(screensaver.id, animation);
      }
    });
  }
}

module.exports = App;

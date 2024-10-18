/**
 * Bishiba's AudioPlayer - JavaScript Audio Manager
 * 
 * Features:
 * - Seamless music looping with support for multiple tracks.
 * - Crossfade between music tracks with customizable fade duration.
 * - Sound effects (SFX) playback that allows multiple sounds to play simultaneously.
 * - Background sound (BGS) looping until manually stopped.
 * - Preloading of audio files in .ogg, .mp3, and .wav formats (with fallback support).
 * - Volume control for Music, SFX, BGS, and master volume.
 * - Mute toggles for Music, SFX, and BGS.
 * - Pause and resume functionality for all audio tracks.
 * - Error handling for failed audio loading.
 * 
 * Methods:
 * - preloadMusic(array): Preloads an array of music file names (without extensions).
 * - preloadSFX(array): Preloads an array of sound effect file names (without extensions).
 * - preloadBGS(array): Preloads an array of background sound file names (without extensions).
 * - playMusic(name, fadeDuration): Plays a music track by name, with optional crossfade duration (ms).
 * - playSFX(name): Instantly plays a sound effect by name.
 * - playBGS(name): Plays a looping background sound by name until stopped manually.
 * - stopBGS(): Stops the currently playing background sound.
 * - pause(): Pauses all audio (Music, SFX, and BGS).
 * - resume(): Resumes all audio (Music, SFX, and BGS).
 * - setMusicVolume(volume): Sets the volume for music (0 to 1).
 * - setSFXVolume(volume): Sets the volume for sound effects (0 to 1).
 * - setBGSVolume(volume): Sets the volume for background sound (0 to 1).
 * - setMasterVolume(volume): Sets the master volume for all sounds (0 to 1).
 * - toggleMuteMusic(): Mutes/unmutes music.
 * - toggleMuteSFX(): Mutes/unmutes sound effects.
 * - toggleMuteBGS(): Mutes/unmutes background sound.
 * 
 * Usage Example:
 * const player = new AudioPlayer();
 * player.preloadMusic(['track1', 'track2']);
 * player.preloadSFX(['sfx1', 'sfx2']);
 * player.preloadBGS(['bgs1']);
 * player.playMusic('track1', 2000);  // Plays track1 with a 2-second crossfade
 * player.playSFX('sfx1');            // Instantly plays sound effect sfx1
 * player.playBGS('bgs1');            // Plays background sound bgs1 in a loop
 */

class AudioPlayer {
    constructor() {
        this.musicVolume = 1;
        this.sfxVolume = 1;
        this.bgsVolume = 1;
        this.masterVolume = 1;

        this.muteMusic = false;
        this.muteSFX = false;
        this.muteBGS = false;

        this.musicArray = [];
        this.sfxArray = [];
        this.bgsArray = [];

        this.currentMusic = null;
        this.currentBGS = [];
        this.maxBGS = 6;

        this.isPaused = false;

        this.audioElements = {};
    }

    // Preload functions
    preloadMusic(array) {
        this.musicArray = array;
        this._preloadAudio(array, 'music');
    }

    preloadSFX(array) {
        this.sfxArray = array;
        this._preloadAudio(array, 'sfx');
    }

    preloadBGS(array) {
        this.bgsArray = array;
        this._preloadAudio(array, 'bgs');
    }

    _preloadAudio(array, type) {
        array.forEach(name => {
            const audio = new Audio();
            audio.src = `${name}.ogg`;
            audio.onerror = () => {
                audio.src = `${name}.mp3`; // fallback to mp3 if ogg fails
                audio.onerror = () => {
                    audio.src = `${name}.wav`; // fallback to wav if mp3 fails
                    audio.onerror = () => {
                        console.error(`Failed to load audio: ${name}`);
                    };
                };
            };
            audio.load();
            this.audioElements[`${type}_${name}`] = audio;
        });
    }

    // Play Music with crossfade and customizable fade duration
    playMusic(name, fadeDuration = 1000) {
        if (this.muteMusic || this.isPaused) return;

        const newMusic = this._getAudio('music', name);
        newMusic.loop = true;
        newMusic.volume = 0; // Start with zero volume for crossfade
        newMusic.play();

        if (this.currentMusic) {
            this._crossfade(this.currentMusic, newMusic, fadeDuration);
        } else {
            this._fadeInAudio(newMusic, fadeDuration);
        }

        this.currentMusic = newMusic;
    }

    // Crossfade from old audio to new audio
    _crossfade(oldAudio, newAudio, duration) {
        const fadeStep = 50;
        const fadeOutStep = oldAudio.volume / (duration / fadeStep);
        const fadeInStep = this.musicVolume * this.masterVolume / (duration / fadeStep);

        const crossfadeInterval = setInterval(() => {
            if (oldAudio.volume > 0) {
                oldAudio.volume = Math.max(0, oldAudio.volume - fadeOutStep);
            } else {
                oldAudio.pause();
                oldAudio.currentTime = 0;
            }

            if (newAudio.volume < this.musicVolume * this.masterVolume) {
                newAudio.volume = Math.min(this.musicVolume * this.masterVolume, newAudio.volume + fadeInStep);
            } else {
                clearInterval(crossfadeInterval);
            }
        }, fadeStep);
    }

    // Fade in new audio
    _fadeInAudio(audio, duration) {
        const fadeStep = 50;
        const fadeInStep = this.musicVolume * this.masterVolume / (duration / fadeStep);

        const fadeInInterval = setInterval(() => {
            if (audio.volume < this.musicVolume * this.masterVolume) {
                audio.volume = Math.min(this.musicVolume * this.masterVolume, audio.volume + fadeInStep);
            } else {
                clearInterval(fadeInInterval);
            }
        }, fadeStep);
    }

    // Pause and Resume functionality
    pause() {
        if (this.isPaused) return;

        this.isPaused = true;

        if (this.currentMusic) this.currentMusic.pause();
        if (this.currentBGS) this.currentBGS.pause();

        Object.values(this.audioElements).forEach(audio => {
            if (!audio.paused) audio.pause();
        });
    }

    resume() {
        if (!this.isPaused) return;

        this.isPaused = false;

        if (this.currentMusic) this.currentMusic.play();
        if (this.currentBGS) this.currentBGS.play();

        Object.values(this.audioElements).forEach(audio => {
            if (audio.currentTime > 0 && !audio.paused) audio.play();
        });
    }

    // Play Sound Effects (SFX)
    playSFX(name, relativeVolume = 1) {
        if (this.muteSFX || this.isPaused) return;

        const audio = this._getAudio('sfx', name);
        const clone = audio.cloneNode(); // Clone to allow multiple instances of the same SFX
        clone.volume = relativeVolume * this.sfxVolume * this.masterVolume; // Adjust volume with relative, SFX, and master volumes
        clone.play();
    }

    // Play multiple BGS tracks simultaneously (up to 6) with relative volume
    playBGS(name, relativeVolume = 1) {
        if (this.muteBGS || this.isPaused) return;

        if (this.currentBGS.length >= this.maxBGS) {
            console.warn("Maximum number of BGS tracks reached. Cannot play more.");
            return;
        }

        const audio = this._getAudio('bgs', name);
        audio.loop = true;
        audio.volume = relativeVolume * this.bgsVolume * this.masterVolume; // Adjust volume with relative, BGS, and master volumes
        audio.play();

        // Add this track to the array of currently playing BGS
        this.currentBGS.push(audio);
    }

    // Stop a specific BGS track
    stopBGS(name) {
        const bgsKey = `bgs_${name}`;
        const audio = this.audioElements[bgsKey];
        if (!audio || !this.currentBGS.includes(audio)) {
            console.warn(`BGS ${name} is not currently playing.`);
            return;
        }

        // Stop the specific BGS track
        audio.pause();
        audio.currentTime = 0;

        // Remove it from the currently playing array
        this.currentBGS = this.currentBGS.filter(bgs => bgs !== audio);
    }

    // Stop all BGS tracks
    stopAllBGS() {
        this.currentBGS.forEach(bgs => {
            bgs.pause();
            bgs.currentTime = 0;
        });
        this.currentBGS = [];
    }

    // Internal function to get or preload audio
    _getAudio(type, name) {
        const key = `${type}_${name}`;
        if (!this.audioElements[key]) {
            const audio = new Audio();
            audio.src = `${name}.ogg`;
            audio.onerror = () => {
                audio.src = `${name}.mp3`; // fallback to mp3
                audio.onerror = () => {
                    audio.src = `${name}.wav`; // fallback to wav
                    audio.onerror = () => {
                        console.error(`Failed to load audio: ${name}`);
                    };
                };
            };
            audio.load();
            this.audioElements[key] = audio;
        }
        return this.audioElements[key];
    }

    // Volume controls
    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume * this.masterVolume;
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = volume;
    }

    setBGSVolume(volume) {
        this.bgsVolume = volume;
        this.currentBGS.forEach(bgs => {
            bgs.volume = this.bgsVolume * this.masterVolume;
        });
    }

    setMasterVolume(volume) {
        this.masterVolume = volume;
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume * this.masterVolume;
        }
        if (this.currentBGS) {
            this.currentBGS.volume = this.bgsVolume * this.masterVolume;
        }
    }

    // Mute toggles
    toggleMuteMusic() {
        this.muteMusic = !this.muteMusic;
        if (this.muteMusic && this.currentMusic) {
            this.currentMusic.pause();
        } else if (!this.muteMusic && this.currentMusic) {
            this.currentMusic.play();
        }
    }

    toggleMuteSFX() {
        this.muteSFX = !this.muteSFX;
    }

    toggleMuteBGS() {
        this.muteBGS = !this.muteBGS;
        if (this.muteBGS && this.currentBGS) {
            this.currentBGS.pause();
        } else if (!this.muteBGS && this.currentBGS) {
            this.currentBGS.play();
        }
    }
}
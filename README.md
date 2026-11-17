# Stem Flow — Recording Playtest

Independent v14-based test edition. The stable game remains at https://alexhengxu.github.io/stem-flow-play/ .

## Play

Open https://alexhengxu.github.io/stem-flow-recording-test/flowie-intro.html .
Locally, run `python3 serve.py` or use the Mac/Windows launcher. Keep all folders together.

## Record

In Remix, press Space to pause, then select **Record**:

- **Continue from now** records from the current song position.
- **Restart song** seeks all stems to zero and records from the beginning, preserving volume and FX.

Choose the current Stem Flow tab in the browser sharing dialog. Recording waits for live video frames before music starts. Pause suspends recording; Continue resumes the same file. **Stop & save** or End downloads an MP4. Save the current recording before starting another one.

Recording is available only from the Remix pause menu. Song selection and Start do not request screen sharing or start a recording. Piano background music is silent throughout tutorial and Remix.

## Validation

Run `npm run check` with Node.js. Native MP4 test: `tests/record-menu-native.html`.
The browser regression uses generated video and audio, checks both song-start positions, pauses/resumes, seeks the MP4 to its beginning and end, and checks game-pattern pixels rather than the Help pattern.
Real camera, OS sharing selection, and machine-specific performance still need a playtest. No captured camera footage is uploaded by this project.

## MP4 finalization revision (November 17)

The recorder now installs callbacks before starting, writes a complete MP4 without a one-second timeslice, and keeps capture tracks alive until the final data/stop event. Saving while paused resumes the encoder before stopping. `tests/record-menu-native.html?capture=screen` tests the actual selected browser tab; the default mode uses generated video. Both tests inspect changing decoded frames and non-silent decoded audio, and save directly from a paused state. Real-screen testing requires manually choosing the test tab.

## Chrome real-tab verification — November 17

Both recording-menu paths passed with manually selected Chrome tab capture using the production recorder: Continue from now (4.990 seconds) and Restart song (4.687 seconds). Each exported MP4 was decoded and sampled at four timestamps; all four frame signatures differed, and both the first and last audio seconds contained sound. Tests include pause/resume and saving from a paused state. Detailed results: `recording-validation.json`.

The test content is animated artwork and a generated audio signal. These results verify real tab capture and MP4 output; they do not certify full-song gameplay, actual camera footage, or every Chrome/device combination. The stable v14 site remains unchanged.

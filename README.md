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

The v14 setup recording checkbox also remains available: it asks for sharing permission before the tutorial but starts recording only in Remix. Piano background music is silent throughout tutorial and Remix.

## Validation

Run `npm run check` with Node.js. Native MP4 test: `tests/record-menu-native.html`.
The browser regression uses generated video and audio, checks both song-start positions, pauses/resumes, seeks the MP4 to its beginning and end, and checks game-pattern pixels rather than the Help pattern.
Real camera, OS sharing selection, and machine-specific performance still need a playtest. No captured camera footage is uploaded by this project.

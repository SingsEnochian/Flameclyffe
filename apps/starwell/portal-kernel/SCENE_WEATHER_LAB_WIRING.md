# Portal Kernel Scene Weather Lab Wiring

To wire the lab preview to `weatherSoundConductor.js`:

1. Add a textarea in `labs/portal-kernel/index.html`:

```html
<label class="scene-text">
  <span>Scene text for weather sound</span>
  <textarea data-scene-text rows="4">Grow a quiet root room from the Ygg Gate.</textarea>
</label>
```

2. Import the conductor in `labs/portal-kernel/portal-kernel.js`:

```js
import { createWeatherSoundProposal } from '../src/sound/weatherSoundConductor.js';
```

3. Select the textarea:

```js
const sceneTextInput = document.querySelector('[data-scene-text]');
```

4. Replace the current sound proposal with:

```js
const weatherSoundProposal = createWeatherSoundProposal({
  text: sceneTextInput?.value ?? '',
  node,
  inputWeather: weather,
  accessibility,
});
```

5. Set `soundContract.currentProposal` to `weatherSoundProposal`.

6. Re-render JSON on text input:

```js
sceneTextInput?.addEventListener('input', () => {
  renderOutput({ sceneTextChanged: true });
});
```

The lab remains proposal-only. It shows the future scene mix plan but does not start sound.

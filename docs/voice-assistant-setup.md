# Voice Assistant Setup

This guide explains how to connect **Is BVG Fucked Up?** to your voice assistant so you can ask about Berlin transit status hands-free.

---

## How Voice Integration Works

The backend exposes two lightweight endpoints that voice platforms consume:

| Endpoint | Method | Consumer |
|---|---|---|
| `/api/voice` | `GET` | Siri Shortcuts (iOS) |
| `/api/voice/google-assistant` | `POST` | Google Assistant via Dialogflow CX |

Both endpoints read the current transit status from the same in-memory poller cache that powers the web dashboard — responses are instant, no external calls are made at request time.

The response text is a short German sentence that describes the current BVG status and, where applicable, the percentage of services affected. An [SSML](https://developers.google.com/assistant/docs/ssml) variant of the same text is also returned; SSML `<break>` elements add natural pauses between sentences so the speech sounds less robotic.

---

## Siri Shortcuts Setup (iOS)

> **Requirements:** iPhone or iPad with iOS 13 or later, and the Shortcuts app installed (it ships with iOS by default).

1. Open the **Shortcuts** app.
2. Tap the **+** button in the top-right corner to create a **New Shortcut**.
3. Tap **Add Action**.
4. Search for and select **Get Contents of URL**.
5. In the URL field, enter your deployed instance URL followed by the voice endpoint path:
   ```
   https://your-domain.example/api/voice
   ```
6. Tap the **+** button again to add another action.
7. Search for and select **Show Result** (or **Speak** if you want the shortcut to read the status aloud directly).
   - If you chose **Show Result**, Siri will display the `text` field from the JSON response on screen.
   - If you chose **Speak**, Siri will read the `text` field aloud using its built-in text-to-speech.
8. Tap **Done** in the top-right corner.
9. Give the shortcut a name like *"Is BVG fucked?"* and optionally tap the **Settings** gear to enable *"Allow on Home Screen"*.

You can now ask Siri *"Hey Siri, is BVG fucked?"* and she will fetch the latest status and read it back to you.

### Tips

- Rename the shortcut to match exactly what you plan to say so that Siri recognises it reliably.
- Tap **Share** on the shortcut to send it to a friend or to another device via AirDrop.

---

## Google Assistant Setup

> **Requirements:** A [Google Cloud](https://cloud.google.com) project and a [Dialogflow CX](https://cloud.google.com/dialogflow/cx) agent. Google Assistant Actions are subject to Google's review process before they become available to other users.

1. **Create a Dialogflow CX agent**
   - Go to the [Dialogflow CX Console](https://console.cloud.google.com/dialogflow/projects).
   - Select or create a Google Cloud project.
   - Click **Create agent** and choose a language (German is recommended to match the response text).
   - Give the agent a name (e.g. *bvg-status*) and click **Create**.

2. **Add an intent**
   - In the left sidebar, click **Intents** → **+ Create**.
   - Name the intent `bvg.status`.
   - Under *Training phrases*, add phrases your users are likely to say, for example:
     - *Ist BVG gefickt?*
     - *Wie läuft der BVG?*
     - *BVG Status*
   - Click **Save**.

3. **Point the webhook at your voice endpoint**
   - In the left sidebar, click **Fulfillment** (or navigate via the agent settings).
   - Enable the **Webhook** toggle.
   - Set the webhook URL to your deployed instance URL followed by the Google Assistant path:
     ```
     https://your-domain.example/api/voice/google-assistant
     ```
   - Click **Save**.
   - Go back to the `bvg.status` intent, scroll down to *Fulfillment*, and enable *Use webhook* for this intent.

4. **Test in the simulator**
   - In the left sidebar, click **Test** (the chat-bubble icon near the bottom).
   - Type one of your training phrases (e.g. *Ist BVG gefickt?*).
   - The simulator will forward the request to your webhook. You should see the current BVG status spoken back in the response preview.

---

## Example Responses

The voice endpoint returns a short German sentence for each possible transit state. Below are representative examples with 100 total services and 12 % disruption:

| State | Text response |
|---|---|
| **FUCKED** | Ja, BVG ist gefickt. Von 100 Diensten sind 12 Prozent betroffen. |
| **DEGRADED** | BVG ist ein bisschen gefickt. Von 100 Diensten sind 12 Prozent betroffen. |
| **FINE** | Nein, BVG läuft. Von 100 Diensten sind 12 Prozent betroffen. |
| **UNKNOWN** | Keine Daten verfügbar. |

If the status data is stale (i.e. the poller has not received a fresh update within its configured window), the following caveat is appended to every response:

> *Hinweis: Diese Daten können veraltet sein.*

### Raw JSON response — `GET /api/voice`

```json
{
  "text":  "Ja, BVG ist gefickt. Von 100 Diensten sind 12 Prozent betroffen.",
  "ssml":  "<speak>Ja, BVG ist gefickt. <break time=\"800ms\"/>Von 100 Diensten sind 12 Prozent betroffen.</speak>",
  "state": "FUCKED",
  "stale": false
}
```

### Raw JSON response — `POST /api/voice/google-assistant`

```json
{
  "fulfillmentResponse": {
    "messages": [
      {
        "text":   { "text": ["Ja, BVG ist gefickt. Von 100 Diensten sind 12 Prozent betroffen."] },
        "speech": "<speak>Ja, BVG ist gefickt. <break time=\"800ms\"/>Von 100 Diensten sind 12 Prozent betroffen.</speak>"
      }
    ]
  }
}
```

---

## Smart Speaker Compatibility

| Speaker | Voice Assistant | Notes |
|---|---|---|
| **Apple HomePod / HomePod mini** | Siri | Set up the Siri Shortcut as described above. HomePod picks up "Hey Siri" commands and runs Shortcuts automatically — no extra configuration needed once the shortcut is created on a linked iPhone. |
| **Google Home / Google Nest (Hub, Mini, Max)** | Google Assistant | Once your Dialogflow CX agent is published and linked to a Google Assistant Action, any Google Home or Nest device on the same account will be able to trigger it with a voice command. |

> **Note:** Google Assistant Actions require a review and approval step by Google before they are available to end-users on Google Home / Nest devices. During development you can use the [Actions Builder simulator](https://actions.google.com/develop) to test without publishing.

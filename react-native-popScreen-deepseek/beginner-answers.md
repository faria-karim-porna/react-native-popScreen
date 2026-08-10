# PopScreen — Beginner Questions & Answers

> Written for freshers. Every answer is given in **English** and **Bangla (বাংলা)** in the simplest way possible.

---

## Question 1: Can we use TypeScript instead of JavaScript throughout the app? If no, then why?

### English Answer

**Yes, you can — and in fact, the library core is already written in TypeScript!**

- The main library code lives in the `src/` folder and is already `.ts` / `.tsx` files (for example `src/usePopScreen.ts`, `src/createOverlayStore.ts`, `src/index.ts`).
- React Native and Expo support TypeScript **out of the box**. Look at the file `tsconfig.json` — it already extends `expo/tsconfig.base` with strict mode on.
- The app entry files (`App.js`, `index.js`) are still JavaScript, but the demo files (`demos/*.tsx`, `OverlaySwitcher.tsx`) have **already been converted to TypeScript**. TypeScript and JavaScript can mix freely — the remaining JS files can be renamed to `.tsx` / `.ts` whenever you want. Even the Jest test setup already knows how to run `.ts` and `.tsx` files.

**A few small things to keep in mind:**

1. **Native Android code cannot be TypeScript.** The Kotlin files (`OverlayService.kt`, `PopScreenModule.kt`) must stay in Kotlin. TypeScript only replaces JavaScript, not native code.
2. React component types come from `@types/react` (already available in `node_modules`, pulled in by Expo's tooling).
3. `package.json` says `"main": "index.js"`. If you rename your entry file to TypeScript, make sure this points to the correct file, because Metro finds the app entry through that field.

**Simple summary:** TypeScript and JavaScript can live side by side. Nothing blocks you from using TypeScript everywhere in the JS world of this app.

### বাংলা উত্তর

**হ্যাঁ, পারবেন — আর মজার ব্যাপার হলো, লাইব্রেরির মূল কোড তো আগে থেকেই TypeScript-এ লেখা!**

- লাইব্রেরির মূল কোড `src/` ফোল্ডারে আছে এবং সেগুলো আগেই `.ts` / `.tsx` ফাইলে লেখা (যেমন `src/usePopScreen.ts`, `src/createOverlayStore.ts`, `src/index.ts`)।
- React Native এবং Expo TypeScript **একদম ফ্রি-তে সাপোর্ট করে**। দেখুন `tsconfig.json` ফাইলটা — এটা আগে থেকেই `expo/tsconfig.base`-কে strict মোডসহ ব্যবহার করছে।
- অ্যাপের এন্ট্রি ফাইলগুলো (`App.js`, `index.js`) এখনো JavaScript-এ আছে, কিন্তু ডেমো ফাইলগুলো (`demos/*.tsx`, `OverlaySwitcher.tsx`) **আগেই TypeScript-এ রূপান্তর হয়ে গেছে**। TypeScript আর JavaScript সহজেই মিশে থাকতে পারে — বাকি JS ফাইলগুলোও চাইলে যেকোনো সময় `.tsx` / `.ts` নামে বদলে নিতে পারবেন। এমনকি Jest টেস্ট সিস্টেমও `.ts` এবং `.tsx` ফাইল চালাতে জানে।

**খেয়াল রাখার কয়েকটা ছোট বিষয়:**

1. **Native Android কোড কখনো TypeScript হবে না।** Kotlin ফাইলগুলো (`OverlayService.kt`, `PopScreenModule.kt`) Kotlin-ই থাকবে। TypeScript শুধু JavaScript-এর বদলে আসে, native কোডের নয়।
2. React কম্পোনেন্টের টাইপ আসে `@types/react` থেকে (এটা `node_modules`-এ আগে থেকেই আছে, Expo-র টুলিং ইনস্টল করে দিয়েছে)।
3. `package.json`-এ লেখা আছে `"main": "index.js"`। এন্ট্রি ফাইলটার নাম TypeScript-এ বদলালে নিশ্চিত করুন এই ফিল্ডটা সঠিক ফাইলের দিকে দেখাচ্ছে, কারণ Metro অ্যাপের এন্ট্রি এই ফিল্ড থেকেই খোঁজে।

**সহজ সারকথা:** TypeScript আর JavaScript পাশাপাশি থাকতে পারে। এই অ্যাপের JS-এর জগতে TypeScript ব্যবহার করতে কোনো বাধা নেই।

---

## Question 2: Can we use any other UI other than counter in `@demos/CounterOverlayContent.tsx`?

### English Answer

**Yes, absolutely! The counter is only a demo — the overlay can render ANY React Native UI you want.**

Here is how it works:

- The overlay content is just a **normal React component**. In `index.js`, `registerOverlaySurface(OverlaySwitcher)` tells the library which component to show inside the floating window.
- `OverlaySwitcher.tsx` reads a key called `activeDemo` from the shared store and decides which component to render (`CounterOverlayContent` or `InputSubmitOverlayContent`).

**To make your own UI, you only need 3 steps:**

1. Create a new file, for example `demos/MyWidgetOverlayContent.tsx`.
2. Write any normal React Native UI, wrapped inside `<PopScreenContent>`.
3. Import your component in `OverlaySwitcher.tsx` and return it instead of (or alongside) the counter.

**Two state patterns you can choose from:**

| Pattern | When to use | Example |
|---|---|---|
| `usePopScreen('key', default)` | When the main app AND the overlay both need to see the value | The counter's `count` |
| Plain `useState` | When only the overlay needs the value | `InputSubmitOverlayContent.tsx` (text draft) |

**Fun ideas for your own UI:** a music player control, a quick note / ToDo widget, a chat bubble, a weather widget, a timer, a clipboard history panel — anything you can build with React Native.

### বাংলা উত্তর

**হ্যাঁ, একদম পারবেন! কাউন্টারটা শুধু একটা ডেমো — ওভারলেতে আপনি চাইলেই যেকোনো React Native UI দেখাতে পারবেন।**

এটা কীভাবে কাজ করে:

- ওভারলে কনটেন্ট আসলে একটা **সাধারণ React কম্পোনেন্ট**। `index.js`-এ `registerOverlaySurface(OverlaySwitcher)`-এর মাধ্যমে লাইব্রেরিকে বলা হয় ফ্লোটিং উইন্ডোর ভেতরে কোন কম্পোনেন্ট দেখাতে হবে।
- `OverlaySwitcher.tsx` শেয়ার্ড স্টোর থেকে `activeDemo` নামের একটা key পড়ে ঠিক করে কোন কম্পোনেন্ট রেন্ডার হবে (`CounterOverlayContent` নাকি `InputSubmitOverlayContent`)।

**নিজের UI বানাতে শুধু ৩টা ধাপ:**

1. নতুন ফাইল বানান, যেমন `demos/MyWidgetOverlayContent.tsx`।
2. যেকোনো সাধারণ React Native UI লিখুন, সেটাকে `<PopScreenContent>`-এর ভেতরে রাখুন।
3. `OverlaySwitcher.tsx`-এ আপনার কম্পোনেন্টটা import করে কাউন্টারের বদলে (বা পাশাপাশি) রিটার্ন করুন।

**দুটো state প্যাটার্ন, যা থেকে বেছে নিতে পারবেন:**

| প্যাটার্ন | কখন ব্যবহার করবেন | উদাহরণ |
|---|---|---|
| `usePopScreen('key', default)` | যখন main অ্যাপ **আর** ওভারলে — দুজনেরই মানটা দেখতে হবে | কাউন্টারের `count` |
| সাধারণ `useState` | যখন শুধু ওভারলেতেই মানটা লাগবে | `InputSubmitOverlayContent.tsx` (টেক্সট ড্রাফট) |

**নিজের UI-র মজার আইডিয়া:** মিউজিক প্লেয়ার কন্ট্রোল, দ্রুত নোট/ToDo উইজেট, চ্যাট বাবল, আবহাওয়ার উইজেট, টাইমার, ক্লিপবোর্ড হিস্ট্রি প্যানেল — React Native দিয়ে যা বানাতে পারেন, সবই।

---

## Question 3: How will a user use the overlay for any kind of UI in their project?

### English Answer

Here is the full flow, step by step, from the perspective of someone using the library in their own app:

**Step 1 — Install & set up**

```bash
npx expo install popscreen
npx expo install expo-dev-client
npx expo prebuild --platform android
```

(Then, from the library project: `npm run build` and `npm run build:plugin` so the library and its config plugin are compiled.)

**Step 2 — Register your overlay component in the app entry (`index.js`)**

```jsx
import { registerRootComponent } from 'expo';
import App from './App';
import MyOverlay from './MyOverlay';
import { registerOverlaySurface } from 'popscreen';

registerRootComponent(App);          // normal main app
registerOverlaySurface(MyOverlay);   // what shows inside the floating window
```

**Step 3 — Build your overlay component (any UI you want)**

```jsx
import { PopScreenContent } from 'popscreen';
import { View, Text } from 'react-native';

export default function MyOverlay() {
  return (
    <PopScreenContent>
      <View>
        <Text>Hello from the floating window!</Text>
        {/* any other RN components here */}
      </View>
    </PopScreenContent>
  );
}
```

**Step 4 — Ask for permission, then show / hide / destroy from the main app**

```jsx
import { hasOverlayPermission, requestOverlayPermission, show, hide, destroy } from 'popscreen';

// 1. Check & request "Display over other apps" permission (Android API 26+)
const ok = await hasOverlayPermission();
if (!ok) await requestOverlayPermission();

// 2. Control the overlay lifecycle
show();     // open the floating window
hide();     // hide it (keeps it alive)
destroy();  // remove it completely
```

**Step 5 — (Optional) Share state between the main app and the overlay**

```jsx
import { usePopScreen } from 'popscreen';

function MainScreen() {
  const [count, setCount] = usePopScreen('count', 0);
  // ...
}
```

The same `usePopScreen('count', ...)` inside your overlay component reads and writes the same value — both surfaces update instantly.

### বাংলা উত্তর

নিজের প্রজেক্টে কেউ কীভাবে এই লাইব্রেরি দিয়ে যেকোনো UI-র ওভারলে ব্যবহার করবে, তার পুরো ধাপগুলো এখানে:

**ধাপ ১ — ইনস্টল ও সেটআপ**

```bash
npx expo install popscreen
npx expo install expo-dev-client
npx expo prebuild --platform android
```

(তারপর লাইব্রেরি প্রজেক্ট থেকে: `npm run build` আর `npm run build:plugin` — যাতে লাইব্রেরি আর এর কনফিগ প্লাগইন কম্পাইল হয়।)

**ধাপ ২ — অ্যাপের এন্ট্রি ফাইলে (`index.js`) নিজের ওভারলে কম্পোনেন্ট রেজিস্টার করুন**

```jsx
import { registerRootComponent } from 'expo';
import App from './App';
import MyOverlay from './MyOverlay';
import { registerOverlaySurface } from 'popscreen';

registerRootComponent(App);          // সাধারণ main অ্যাপ
registerOverlaySurface(MyOverlay);   // ফ্লোটিং উইন্ডোর ভেতরে যা দেখাবে
```

**ধাপ ৩ — নিজের ওভারলে কম্পোনেন্ট বানান (যেকোনো UI)**

```jsx
import { PopScreenContent } from 'popscreen';
import { View, Text } from 'react-native';

export default function MyOverlay() {
  return (
    <PopScreenContent>
      <View>
        <Text>Hello from the floating window!</Text>
        {/* এখানে যেকোনো RN কম্পোনেন্ট */}
      </View>
    </PopScreenContent>
  );
}
```

**ধাপ ৪ — পারমিশন নিন, তারপর main অ্যাপ থেকে show / hide / destroy করুন**

```jsx
import { hasOverlayPermission, requestOverlayPermission, show, hide, destroy } from 'popscreen';

// 1. "Display over other apps" পারমিশন চেক ও রিকোয়েস্ট করুন (Android API 26+)
const ok = await hasOverlayPermission();
if (!ok) await requestOverlayPermission();

// 2. ওভারলের লাইফসাইকেল কন্ট্রোল করুন
show();     // ফ্লোটিং উইন্ডো খুলবে
hide();     // লুকাবে (জীবিতই থাকবে)
destroy();  // পুরোপুরি মুছে ফেলবে
```

**ধাপ ৫ — (ঐচ্ছিক) main অ্যাপ আর ওভারলের মধ্যে state শেয়ার করুন**

```jsx
import { usePopScreen } from 'popscreen';

function MainScreen() {
  const [count, setCount] = usePopScreen('count', 0);
  // ...
}
```

আপনার ওভারলে কম্পোনেন্টের ভেতরেও একই `usePopScreen('count', ...)` ব্যবহার করলে দুটো জায়গাই একই মান পড়বে-লিখবে — দুজায়গাতেই সাথে সাথে আপডেট হয়।

---

## Quick Recap (দ্রুত সারসংক্ষেপ)

| Question (প্রশ্ন) | Short Answer (সংক্ষিপ্ত উত্তর) |
|---|---|
| 1. TypeScript through the app? | **Yes** — library core is already TS, and the demos (`demos/*.tsx`, `OverlaySwitcher.tsx`) now are too; the app entry (`App.js`, `index.js`) is still JS and can be converted as well. Native Kotlin stays Kotlin. (**হ্যাঁ** — লাইব্রেরি আগেই TS-এ, আর ডেমো (`demos/*.tsx`, `OverlaySwitcher.tsx`)-ও এখন TS-এ; অ্যাপ এন্ট্রি (`App.js`, `index.js`) এখনো JS, চাইলে ওগুলোও বদলানো যাবে। Native Kotlin Kotlin-ই থাকবে।) |
| 2. Other UI instead of counter? | **Yes** — the overlay renders any RN UI. Make a component, wrap it in `<PopScreenContent>`, swap it in `OverlaySwitcher.tsx`. (**হ্যাঁ** — ওভারলে যেকোনো RN UI দেখাতে পারে। কম্পোনেন্ট বানিয়ে `<PopScreenContent>`-এ মুড়ে `OverlaySwitcher.tsx`-এ বসান।) |
| 3. How a user uses it? | Install → `registerOverlaySurface(MyOverlay)` → build UI inside `<PopScreenContent>` → request permission → `show()` / `hide()` / `destroy()`. (ইনস্টল → `registerOverlaySurface(MyOverlay)` → `<PopScreenContent>`-এ UI বানান → পারমিশন নিন → `show()` / `hide()` / `destroy()`।) |

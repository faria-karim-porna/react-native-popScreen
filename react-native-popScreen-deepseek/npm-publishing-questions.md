# npm পাবলিশিং ও ব্যবহার — প্রশ্ন ও উত্তর (বাংলা)

> এই ডকুমেন্টে PopScreen লাইব্রেরিটিকে npm-এ পাবলিশ, অন্য ডেভেলপারদের ব্যবহার, Google Play Store পলিসি, EAS Build এবং স্বয়ংক্রিয়করণ (Automation) সংক্রান্ত প্রশ্নসমূহের নির্ভুল উত্তর বাংলায় বিস্তারিত দেওয়া হলো।

---

## প্রশ্ন ১: npm কমিউনিটিতে আপলোড

**আমি কীভাবে এটাকে npm কমিউনিটিতে আপলোড করতে পারি, যাতে অন্য লোকেরা এটা ব্যবহার করতে পারে?**

### উত্তর

npm-এ পাবলিক প্যাকেজ পাবলিশ করা খুবই সহজ এবং সম্পূর্ণ বিনামূল্যে (Free)। এই প্রজেক্টটি (PopScreen) npm লাইব্রেরি হিসেবে পাবলিশ করার জন্য তৈরি করা হয়েছে (যার মধ্যে `peerDependencies`, `exports`, `.npmignore`, `tsconfig.build.json` এবং Expo Config Plugin যুক্ত আছে)।

নিচে ধাপে ধাপে পাবলিশ করার পুরো প্রক্রিয়াটি দেওয়া হলো:

#### ধাপ ১ — npm অ্যাকাউন্ট তৈরি করুন
[npmjs.com](https://www.npmjs.com)-এ গিয়ে একটি ফ্রি অ্যাকাউন্ট তৈরি করুন। (অথবা টার্মিনাল থেকে `npm adduser` কমান্ড চালিয়েও অ্যাকাউন্ট খোলা যায়।)

#### ধাপ ২ — `package.json`-এর মেটাডেটা ঠিক করুন
পাবলিশের আগে `package.json` ফাইলের প্লেসহোল্ডার মানগুলো আপনার আসল তথ্য দিয়ে পরিবর্তন করুন:

```json
{
  "name": "popscreen",
  "version": "1.0.0",
  "main": "build/index.js",
  "types": "build/index.d.ts",
  "author": "আপনার নাম <your@email.com>",
  "repository": { "type": "git", "url": "https://github.com/আপনার-ইউজারনেম/popscreen.git" },
  "bugs": { "url": "https://github.com/আপনার-ইউজারনেম/popscreen/issues" },
  "homepage": "https://github.com/আপনার-ইউজারনেম/popscreen#readme"
}
```

> **জরুরি সংশোধন (Fix):**
> - **`main` এন্ট্রি পয়েন্ট:** `package.json`-এ `"main"` অবশ্যই `"build/index.js"` হতে হবে (`"index.tsx"` নয়)। কারণ npm পাবলিশ করার সময় `index.tsx` বাদ যায় (বা থাকলে ভাঙা রেফারেন্স তৈরি করে)। `"main": "build/index.js"` দেওয়ায় Node/Metro সরাসরি প্রস্তুতকৃত বিল্ড ফাইলটি পাবে।
> - **নাম যাচাই:** `popscreen` নামটা বর্তমানে npm-এ খালি আছে। তবে পাবলিশের আগে টার্মিনালে `npm view popscreen` চালিয়ে নিশ্চিত হয়ে নিন। অন্য কেউ নিয়ে নিলে `"name"` পরিবর্তন করতে হবে।

#### ধাপ ৩ — npm-এ লগইন করুন
টার্মিনালে নিচের কমান্ডটি চালিয়ে আপনার npm অ্যাকাউন্টে লগইন করুন:

```bash
npm login
```

#### ধাপ ৪ — লাইব্রেরি ও প্লাগইন বিল্ড করুন
```bash
npm run prepare
```
> **নোট:** `npm run prepare` কমান্ডটি লাইব্রেরির JS/TypeScript (`npm run build`) এবং Expo কনফিগ প্লাগইন (`npm run build:plugin`) দুটোকেই একসাথে বিল্ড করে। যখনই আপনি `npm publish` চালাবেন, npm নিজে থেকেই এই `prepare` স্ক্রিপ্টটি চালিয়ে বিল্ড সম্পন্ন করবে।

#### ধাপ ৫ — পাবলিশের আগে যাচাই করুন (Dry Run)
```bash
npm pack --dry-run
```
এই কমান্ডের মাধ্যমে আপনি দেখতে পারবেন ঠিক কোন কোন ফাইল npm প্যাকেজে যুক্ত হচ্ছে। `.npmignore` সঠিকভাবে কাজ করায় প্যাকেজে শুধু প্রয়োজনীয় বিল্ড ফাইলগুলো (~৩২KB) যাবে এবং কোনো বাড়তি ডেভেলপমেন্ট বা টেস্ট ফাইল যাবে না।

#### ধাপ ৬ — npm-এ পাবলিশ করুন
```bash
npm publish --access public
```

ভবিষ্যতে নতুন আপডেট বা বাগ ফিক্স দিলে ভার্সন বাড়িয়ে পুনরায় পাবলিশ করতে হবে:
```bash
npm version patch   # 1.0.0 → 1.0.1 (বাগ ফিক্স)
npm version minor   # 1.0.0 → 1.1.0 (নতুন ফিচার)
npm version major   # 1.0.0 → 2.0.0 (ব্রেকিং চেঞ্জ)
npm publish
```

---

## প্রশ্ন ২: টাকা বা ক্রেডিট কার্ডের প্রয়োজন

**এটা আপলোড করার জন্য কি আমার কোনো ধরনের অর্থ বা ক্রেডিট কার্ডের তথ্যের প্রয়োজন আছে?**

### উত্তর

**না, একদমই নেই — সম্পূর্ণ ফ্রি।**

- npm-এ **পাবলিক (Public) প্যাকেজ** পাবলিশ করতে কোনো টাকা লাগে না।
- অ্যাকাউন্ট তৈরি করতে বা প্যাকেজ আপলোড করতে **ক্রেডিট কার্ড বা ডেবিট কার্ডের কোনো তথ্য লাগে না** — শুধুমাত্র একটি ইমেইল এবং ইউজারনেম-পাসওয়ার্ড প্রয়োজন।
- PopScreen লাইব্রেরিটি MIT লাইসেন্সের অধীনে একটি ওপেন-সোর্স প্রজেক্ট, যা পাবলিক প্যাকেজ হিসেবে পাবলিশ করা সম্পূর্ণ বিনামূল্যে।

| প্যাকেজের ধরন | ক্রেডিট কার্ড / টাকা লাগবে? | আমাদের জন্য প্রযোজ্য? |
|---|---|---|
| **পাবলিক প্যাকেজ (Public Package)** | ❌ লাগবে না (১০০% ফ্রি) | ✅ আমরা পাবলিক প্যাকেজ দিচ্ছি |
| **প্রাইভেট প্যাকেজ (Private Package)** | 💳 হ্যাঁ (npm Paid Plan) | ❌ লাগবে না |
| **অ্যাকাউন্ট তৈরি** | ❌ ফ্রি | ✅ ফ্রি |

**সারকথা:** npm-এ অ্যাকাউন্ট খুলে `npm publish --access public` দিলেই আপনার প্যাকেজ বিশ্বজুড়ে সবাই ব্যবহার করতে পারবে। কোনো টাকা বা কার্ড লাগবে না।

---

## প্রশ্ন ৩: ডেভেলপাররা কীভাবে ব্যবহার করবে

**একজন ডেভেলপার কীভাবে এটা ব্যবহার করতে পারবে? ইনস্টলেশন থেকে শুরু করে সেটআপ এবং নিজের প্রজেক্টে ইন্টিগ্রেট করা পর্যন্ত পুরো প্রক্রিয়াটা কীভাবে হবে?**

### উত্তর

একজন ডেভেলপার তার নিজের Expo (React Native) প্রজেক্টে PopScreen লাইব্রেরিটি ইন্টিগ্রেট করতে নিচের ধাপগুলো অনুসরণ করবে:

#### ধাপ ১ — প্যাকেজ ইনস্টল
ডেভেলপার তার প্রজেক্ট টার্মিনালে নিচের কমান্ডটি চালাবে:

```bash
npx expo install popscreen
npx expo install expo-dev-client
```

> **বিশেষ দ্রষ্টব্য:** PopScreen হলো একটি সিস্টেম-লেভেল ওভারলে লাইব্রেরি যা **Android 8.0+ (API 26+)** সাপোর্ট করে। এটি **Expo Go অ্যাপে সরাসরি চলে না** — তাই ডেভেলপমেন্ট ও পরীক্ষার জন্য `expo-dev-client` (Custom Dev Client) আবশ্যক।

#### ধাপ ২ — `app.json`-এ Expo কনফিগ প্লাগইন যুক্ত করা
Expo Autolinking-এর সুবিধা নিতে প্রজেক্টের `app.json` ফাইলে `plugins`-এ `popscreen` যোগ করা যেতে পারে:

```json
{
  "expo": {
    "name": "My App",
    "slug": "my-app",
    "plugins": [
      "popscreen"
    ]
  }
}
```

#### ধাপ ৩ — Android প্রজেক্ট জেনারেট করা (Prebuild)
```bash
npx expo prebuild --platform android
```
এই কমান্ডটি চালালে PopScreen-এর কনফিগ প্লাগইন নিজে থেকেই `AndroidManifest.xml`-এ দরকারি পারমিশন ও ফোরগ্রাউন্ড সার্ভিস কোড যোগ করবে এবং নেটিভ কোটলিন সার্ভিস অটোমেটিক ইনজেক্ট করে দেবে।

#### ধাপ ৪ — অ্যাপের এন্ট্রি ফাইলে (`index.js`) ওভারলে সারফেস রেজিস্টার করা
অ্যাপ চালুর শুরুতেই ওভারলে উইন্ডোর কম্পোনেন্টটি রেজিস্টার করতে হবে:

```jsx
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import FloatingBubble from './FloatingBubble';

// Main App রেজিস্টার
registerRootComponent(App);

// ভাসমান (Floating) উইন্ডোর UI রেজিস্টার
registerOverlaySurface(FloatingBubble);
```

#### ধাপ ৫ — ওভারলে কম্পোনেন্ট তৈরি করা
```tsx
// FloatingBubble.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { PopScreenContent } from 'popscreen';

export default function FloatingBubble() {
  return (
    <PopScreenContent>
      <Text style={styles.text}>👋 Hello from Floating Overlay!</Text>
    </PopScreenContent>
  );
}

const styles = StyleSheet.create({
  text: { color: '#ffffff', fontWeight: 'bold' }
});
```

#### ধাপ ৬ — পারমিশন নেওয়া ও ফ্লোটিং উইন্ডো চালু করা
Main অ্যাপ থেকে ওভারলে উইন্ডোটি চালু করা:

```jsx
import * as PopScreen from 'popscreen';

async function startOverlay() {
  // ১. "Display over other apps" পারমিশন আছে কি না দেখা ও নেওয়া
  const hasPermission = await PopScreen.hasOverlayPermission();
  if (!hasPermission) {
    await PopScreen.requestOverlayPermission();
  }

  // ২. ফ্লোটিং উইন্ডো স্ক্রিনে দেখানো
  await PopScreen.show();
}
```

#### ধাপ ৭ — Main App ও Overlay-এর মধ্যে স্টেট (State) শেয়ার করা (ঐচ্ছিক)
```jsx
import { usePopScreen } from 'popscreen';

function MainScreen() {
  // 'counter' কি (key) ব্যবহার করে উভয় জায়গায় রিয়েল-টাইম স্টেট সিঙ্ক
  const [count, setCount] = usePopScreen('counter', 0);

  return (
    <Button title={`Count: ${count}`} onPress={() => setCount(count + 1)} />
  );
}
```

---

## প্রশ্ন ৪: Google Play Store পলিসি ও সিকিউরিটি ইস্যু

**যদি কোনো ডেভেলপার এই লাইব্রেরি ব্যবহার করে অ্যাপ তৈরি করে, তবে গুগল প্লে স্টোরে (Google Play Store) আপলোড/পাবলিশ করার সময় পলিসি, সিকিউরিটি বা অন্য কোনো সমস্যা ফেস করবে কি না?**

### উত্তর

**প্লে স্টোরে আপলোড করা ১০০% সম্ভব, তবে বেশ কিছু নির্দিষ্ট প্লে স্টোর পলিসি মানতে হবে:**

১. **`SYSTEM_ALERT_WINDOW` (Display over other apps) পলিসি:** 
   গুগল প্লে স্টোর ভাসমান/ওভারলে উইন্ডোর পারমিশনকে একটি **Restricted Permission** হিসেবে বিবেচনা করে। তাই প্লে স্টোরে অ্যাপ জমা দেওয়ার সময় Google Play Console-এ একটি **Permission Declaration Form** পূরণ করতে হবে এবং অ্যাপের মূল ফিচার (যেমন: মেসেঞ্জার চ্যাট বাবল, ফ্লোটিং প্লেয়ার, টিউটোরিয়াল হেল্পার) স্পষ্ট ভাষায় উল্লেখ করতে হবে।

২. **Android 14+ (API 34+) Foreground Service Declaration:**
   PopScreen অ্যাপ ব্যাকগ্রাউন্ডে থাকলে ওভারলে চালু রাখতে `FOREGROUND_SERVICE` এবং `FOREGROUND_SERVICE_SPECIAL_USE` ব্যবহার করে। প্লে কনসোলে `specialUse` ফোরগ্রাউন্ড সার্ভিস সাবটাইপ নির্বাচন করে কারণ ব্যাখ্যা করতে হবে।

৩. **সিকিউরিটি ও ট্যাপজ্যাকিং (Tapjacking):**
   লাইব্রেরিটিতে অ্যান্ড্রয়েডের অফিশিয়াল `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY` ব্যবহার করা হয়েছে যা সুরক্ষিত। এটি ইউজার পারমিশন ছাড়া নিজে থেকে কোনো ওভারলে চালু করতে পারে না।

> 💡 **গাইডলাইন ডকুমেন্ট:** প্রজেক্টের ভেতর `docs/play-policy-guidance.md` নামের একটি ফাইল রয়েছে। সেখানে গুগল প্লে স্টোর ডিক্লারেশন কীভাবে পূরণ করতে হবে তার লিখিত পরামর্শ দেওয়া হয়েছে।

---

## প্রশ্ন ৫: `expo-dev-client` ইনস্টল করার বাধ্যবাধকতা

**ডেভেলপার যদি লোকাল ডিভাইসে টেস্ট না করে সরাসরি EAS Cloud (`eas build --platform android --profile production`) দিয়ে প্রোডাকশন বিল্ড দিতে চায়, তাহলে কি `npx expo install expo-dev-client` চালানো বাধ্যতামূলক?**

### উত্তর

**না, একদমই বাধ্যতামূলক নয়।**

- `expo-dev-client` মূলত ডেভেলপমেন্ট চলাকালীন লোকাল ডিভাইসে বা এমুলেটরে কাস্টম ডেভেলপমেন্ট বিল্ড (`eas build --profile development`) চালিয়ে লাইভ রিলোড ও ডিবাগিংয়ের জন্য ব্যবহৃত হয়।
- ডেভেলপার যদি সরাসরি ক্লাউডে প্রোডাকশন বিল্ড (`eas build --profile production`) দেয়, তবে `expo-dev-client` প্রজেক্টে না থাকলেও কোনো সমস্যা নেই। প্রোডাকশন বিল্ডে Dev Client ফাইল প্রয়োজন হয় না।

---

## প্রশ্ন ৬: লোকাল মেশিনে `npx expo prebuild` চালানো

**ডেভেলপার যদি লোকাল ডিভাইসে টেস্ট না করে সরাসরি EAS Cloud (`eas build --platform android --profile production`) দিয়ে প্রোডাকশন বিল্ড দিতে চায়, তাহলে কি লোকালি `npx expo prebuild --platform android` চালানো বাধ্যতামূলক?**

### উত্তর

**না, লোকাল কম্পিউটারে `npx expo prebuild` চালানো বাধ্যতামূলক নয়।**

- **EAS Cloud স্বয়ংক্রিয়ভাবে Prebuild করে:** যখনই ডেভেলপার `eas build` কমান্ড দেয়, EAS Cloud সার্ভার নিজে থেকেই বিল্ড প্রক্রিয়া শুরুর পূর্বে রিমোট সার্ভারে `expo prebuild` রান করে এবং PopScreen-এর কনফিগ প্লাগইন প্রয়োগ করে অ্যান্ড্রয়েড নেটিভ প্রজেক্ট তৈরি করে নেয়।
- ডেভেলপারকে শুধুমাত্র প্রজেক্ট তৈরি করে `eas build` রান করলেই চলবে — লোকাল কম্পিউটারে কোনো অ্যান্ড্রয়েড বিল্ড ফোল্ডার বা প্রিবিল্ড চালানোর দরকার নেই।

---

## প্রশ্ন ৭: লাইব্রেরি আপডেটের মাধ্যমে অটোমেশন (Automation)

**এই লাইব্রেরিটিকে এমনভাবে আপডেট করা সম্ভব কি না যাতে কোনো ডেভেলপার এটি তার প্রজেক্টে ইনস্টল করার পর প্রশ্ন ৩-এর ধাপ ২ (app.json-এ প্লাগইন যোগ), ধাপ ৩ (prebuild) এবং ধাপ ৪ (সারফেস রেজিস্টার) স্বয়ংক্রিয়ভাবে (Automatically) হয়ে যায়?**

### উত্তর

হ্যাঁ, লাইব্রেরির আর্কিটেকচারের মাধ্যমে কিছু কাজ স্বয়ংক্রিয় করা সম্ভব, তবে সবকটি নয়। বিস্তারিত নিচে দেওয়া হলো:

| ধাপ | এটি কি অটোমেট করা সম্ভব? | ব্যাখ্যা ও কীভাবে কাজ করে |
|---|---|---|
| **ধাপ ২ (`app.json`-এ প্লাগইন যোগ)** | ✅ **হ্যাঁ, ১০০% সম্ভব (ইতিমধ্যেই অটোমেট করা হয়েছে)** | প্রজেক্টের `expo-module.config.json` ফাইলে `"plugin": "./app.plugin.js"` যুক্ত করা হয়েছে। এর ফলে Expo-এর **Autolinking** সিস্টেম নিজে থেকেই PopScreen-এর প্লাগইনটি সনাক্ত করে নেবে। ডেভেলপারকে ম্যানুয়ালি `app.json`-এর `plugins` লিস্টে `"popscreen"` না লিখলেও চলবে। |
| **ধাপ ৩ (`prebuild` কমান্ড)** | ✅ **হ্যাঁ, স্বয়ংক্রিয় (EAS & Expo Run)** | ডেভেলপার যখন `eas build` অথবা `npx expo run:android` চালাবে, তখন Expo CLI ব্যাকগ্রাউন্ডে নিজে থেকেই `prebuild` রান করে নেটিভ ফাইল জেনারেট করে নেয়। আলাদা করে ম্যানুয়ালি কমান্ড দেওয়ার প্রয়োজন নেই। |
| **ধাপ ৪ (`registerOverlaySurface`)** | ⚠️ **না (আংশিক কোড ম্যানুয়ালি লাগবে)** | লাইব্রেরি স্বয়ংক্রিয়ভাবে অনুমান করতে পারবে না যে ডেভেলপার ঠিক **কোন React Component-টি** (যেমন: `MyBubble`, `VideoPlayer`, নাকি `ChatWindow`) ওভারলে হিসেবে দেখাতে চান। তাই ডেভেলপারকে তার অ্যাপের এন্ট্রি ফাইলে অন্তত ১ লাইন কোড লিখতেই হবে: `registerOverlaySurface(YourComponent)`। |

---

### আপডেট সারসংক্ষেপ:

PopScreen লাইব্রেরিটির v1.0.0 রিলিজটি Expo Autolinking এবং EAS Cloud Build-এর সাথে সম্পূর্ণ সামঞ্জস্যপূর্ণ। ডেভেলপাররা ন্যূনতম কোড ও কনফিগারেশনেই লাইব্রেরিটি ব্যবহার করতে পারবেন।

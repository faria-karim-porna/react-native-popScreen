# npm পাবলিশিং ও ব্যবহার — প্রশ্ন ও উত্তর (বাংলা)

> এই ডকুমেন্টে PopScreen লাইব্রেরিটিকে npm-এ পাবলিশ এবং অন্য ডেভেলপারদের ব্যবহার সংক্রান্ত তিনটি মূল প্রশ্ন এবং তার সম্পূর্ণ নির্ভুল উত্তর বাংলায় বিস্তারিত দেওয়া হলো।

---

## প্রশ্ন ১: npm কমিউনিটিতে আপলোড

**আমি কীভাবে এটাকে npm কমিউনিটিতে আপলোড করতে পারি, যাতে অন্য লোকেরা এটা ব্যবহার করতে পারে?**

### উত্তর

npm-এ পাবলিক প্যাকেজ পাবলিশ করা খুবই সহজ এবং সম্পূর্ণ বিনামূল্যে (Free)। এই প্রজেক্টটি (PopScreen) npm লাইব্রেরি হিসেবে পাবলিশ করার জন্য তৈরি করা হয়েছে (যার মধ্যে `peerDependencies`, `exports`, `.npmignore`, `tsconfig.build.json` এবং Expo Config Plugin যুক্ত আছে)।

নিচে ধাপে ধাপে পাবলিশ করার পুরো প্রক্রিয়াটি দেওয়া হলো:

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
এই কমান্ডের মাধ্যমে আপনি দেখতে পারবেন ঠিক কোন কোন ফাইল npm প্যাকেজে যুক্ত হচ্ছে। `.npmignore` সঠিকভাবে কাজ করায় প্যাকেজে শুধু প্রয়োজনীয় ৪৫টি বিল্ড ফাইল (~৩২KB) যাবে এবং কোনো বাড়তি ডেভেলপমেন্ট ফাইল বা টেস্ট ফাইল যাবে না।

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

#### ধাপ ২ — `app.json`-এ Expo কনফিগ প্লাগইন যুক্ত করা (অত্যন্ত জরুরি)
ডেভেলপারকে তার প্রজেক্টের `app.json` ফাইলে `plugins` অ্যারেনিচে `popscreen` যুক্ত করতে হবে:

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

> **কেন এই ধাপটি জরুরি?** PopScreen লাইব্রেরির সাথে একটি Expo Config Plugin যুক্ত আছে। `app.json`-এ `"popscreen"` না দিলে Expo Prebuild চালানোর সময় প্লাগইনটি কাজ করবে না, যার ফলে Android পারমিশন (`SYSTEM_ALERT_WINDOW`) এবং নেটিভ সার্ভিস ডিক্লারেশন যুক্ত হবে না।

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

### সম্পূর্ণ গাইডলাইন এক নজরে:

| ধাপ | উদ্দেশ্য | কমান্ড / কোড |
|---|---|---|
| **১** | ইনস্টল | `npx expo install popscreen expo-dev-client` |
| **২** | প্লাগইন সেটআপ | `app.json`-এর `plugins`-এ `"popscreen"` যোগ |
| **৩** | নেটিভ কোড তৈরি | `npx expo prebuild --platform android` |
| **৪** | সারফেস রেজিস্টার | `index.js`-এ `registerOverlaySurface(FloatingBubble)` |
| **৫** | UI ডিফাইন | `<PopScreenContent>` দিয়ে ওভারলে কম্পোনেন্ট তৈরি |
| **৬** | ওভারলে চালু | `requestOverlayPermission()` → `show()` |
| **৭** | স্টেট সিঙ্ক | `const [val, setVal] = usePopScreen('key', initial)` |

> বিস্তারিত API-র জন্য প্রজেক্টের `README.md`, `docs/api-reference.md` এবং Google Play Store রিলিজের দিকনির্দেশনার জন্য `docs/play-policy-guidance.md` অনুসরন করার পরামর্শ দেওয়া হচ্ছে।

# npm পাবলিশিং ও ব্যবহার — প্রশ্ন ও উত্তর (বাংলা)

> এই ডকুমেন্টে PopScreen লাইব্রেরিটিকে npm-এ পাবলিশ ও অন্য ডেভেলপারদের ব্যবহার সংক্রান্ত তিনটি প্রশ্ন এবং তার উত্তর বাংলায় দেওয়া হলো।

---

## প্রশ্ন ১: npm কমিউনিটিতে আপলোড

**আমি কীভাবে এটাকে npm কমিউনিটিতে আপলোড করতে পারি, যাতে অন্য লোকেরা এটা ব্যবহার করতে পারে?**

### উত্তর

খুবই সহজ — npm-এ পাবলিক প্যাকেজ পাবলিশ করা ফ্রি এবং কয়েকটা ধাপেই হয়ে যায়। এই প্রজেক্টটা (PopScreen) ইতিমধ্যেই npm লাইব্রেরি হিসেবে পাবলিশ করার জন্য তৈরি করা হয়েছে (peerDependencies, `exports`, `.npmignore`, `tsconfig.build.json` সবই আছে)। তাই শুধু নিচের ধাপগুলো করতে হবে:

**ধাপ ১ — npm অ্যাকাউন্ট বানান**

[npmjs.com](https://www.npmjs.com)-এ গিয়ে ফ্রি অ্যাকাউন্ট তৈরি করুন। (টার্মিনাল থেকেও `npm adduser` দিয়ে বানানো যায়।)

**ধাপ ২ — `package.json`-এর মেটাডেটা ঠিক করুন**

বর্তমানে কিছু প্লেসহোল্ডার মান আছে, যেগুলো পাবলিশের আগে নিজের তথ্য দিয়ে বদলাতে হবে:

```json
"author": "আপনার নাম <your@email.com>",
"repository": { "url": "https://github.com/আপনার-ইউজারনেম/popscreen.git" },
"bugs":     { "url": "https://github.com/আপনার-ইউজারনেম/popscreen/issues" },
"homepage": "https://github.com/আপনার-ইউজারনেম/popscreen#readme"
```

> **নাম চেক করুন:** `popscreen` নামটা এই মুহূর্তে npm-এ **ফ্রি** (ধরাও হয়নি) — কিন্তু পাবলিশের আগে আবার `npm view popscreen` চালিয়ে নিশ্চিত হয়ে নিন। অন্য কেউ যদি নামটা নিয়ে নেয়, তাহলে `package.json`-এর `"name"` বদলে অন্য নাম দিতে হবে।

**ধাপ ৩ — npm-এ লগইন করুন**

```bash
npm login
```

(এখানে npmjs.com-এর ইউজারনেম, পাসওয়ার্ড আর ইমেইল দিতে হবে।)

**ধাপ ৪ — লাইব্রেরি বিল্ড করুন**

```bash
npm run build        # লাইব্রেরির JS + টাইপ বিল্ড
npm run build:plugin # Expo কনফিগ প্লাগইন বিল্ড
```

**ধাপ ৫ — পাবলিশের আগে দেখে নিন (ঐচ্ছিক কিন্তু ভালো অভ্যাস)**

```bash
npm pack --dry-run
```

এতে দেখা যাবে ঠিক কোন কোন ফাইল প্যাকেজে যাবে (মোটামুটি ৫০টা ফাইল, ~৬৫KB) — কোনো ভুল ফাইল ঢুকছে কি না চেক করে নিন।

**ধাপ ৬ — পাবলিশ করুন**

```bash
npm publish --access public
```

ভবিষ্যতে নতুন ভার্সন দিতে চাইলে:

```bash
npm version patch   # 1.0.0 → 1.0.1 (ছোট ফিক্স)
npm version minor   # 1.0.0 → 1.1.0 (নতুন ফিচার)
npm version major   # 1.0.0 → 2.0.0 (ব্রেকিং চেঞ্জ)
npm publish
```

পাবলিশ হয়ে গেলে যেকোনো ডেভেলপার `npx expo install popscreen` দিয়ে ইন্সটল করতে পারবে।

---

## প্রশ্ন ২: টাকা বা ক্রেডিট কার্ডের প্রয়োজন

**এটা আপলোড করার জন্য কি আমার কোনো ধরনের অর্থ বা ক্রেডিট কার্ডের তথ্যের প্রয়োজন আছে?**

### উত্তর

**না, একদমই নেই — সম্পূর্ণ ফ্রি।**

- npm-এ **পাবলিক প্যাকেজ** পাবলিশ করতে কোনো টাকা লাগে না।
- অ্যাকাউন্ট বানাতে বা পাবলিশ করতে **ক্রেডিট কার্ড/ডেবিট কার্ডের তথ্যও লাগে না** — শুধু একটা ইমেইল আর ইউজারনেম-পাসওয়ার্ডই যথেষ্ট।
- এই লাইব্রেরিটি (PopScreen) মিট লাইসেন্সের (MIT) অধীনে ওপেন-সোর্স, তাই সেটা পাবলিক প্যাকেজ হিসেবে পাবলিশ করাই সঠিক — যেটা পুরোপুরি ফ্রি।

**শুধু একটাই ব্যতিক্রম:** কারো কারো ক্ষেত্রে টাকা লাগতে পারে, কিন্তু আমাদের জন্য সেটা প্রযোজ্য নয় —

| কখন টাকা লাগে | আমাদের জন্য লাগে? |
|---|---|
| **প্রাইভেট (গোপন) প্যাকেজ** পাবলিশ করা — npm-এর পেইড প্ল্যানে চলে যায় | ❌ লাগে না — আমরা পাবলিক প্যাকেজ দিচ্ছি |
| পাবলিক প্যাকেজ পাবলিশ করা | ✅ ফ্রি |
| অ্যাকাউন্ট বানানো | ✅ ফ্রি |

সারকথা: npm অ্যাকাউন্ট বানিয়ে `npm publish` দিলেই হলো — কোনো ক্রেডিট কার্ড, কোনো মাসিক ফি, কিছুই লাগবে না।

---

## প্রশ্ন ৩: ডেভেলপাররা কীভাবে ব্যবহার করবে

**একজন ডেভেলপার কীভাবে এটা ব্যবহার করতে পারবে? ইনস্টলেশন থেকে শুরু করে সেটআপ এবং নিজের প্রজেক্টে ইন্টিগ্রেট করা পর্যন্ত পুরো প্রক্রিয়াটা কীভাবে হবে?**

### উত্তর

একজন ডেভেলপার নিজের Expo + React Native প্রজেক্টে এই লাইব্রেরি ব্যবহার করবে এইভাবে:

**ধাপ ১ — ইন্সটল**

```bash
npx expo install popscreen
npx expo install expo-dev-client
```

> **জরুরি নোট:** এই লাইব্রেরিটি **শুধু Android** (API 26+) সাপোর্ট করে, আর **Expo Go-তে চলে না** — তাই `expo-dev-client` লাগবেই।

**ধাপ ২ — Android প্রজেক্ট তৈরি করুন (prebuild)**

```bash
npx expo prebuild --platform android
```

লাইব্রেরির সাথে আসা Expo কনফিগ প্লাগইন নিজে থেকেই `AndroidManifest.xml`-এ দরকারি পারমিশন (`SYSTEM_ALERT_WINDOW`, ফোরগ্রাউন্ড সার্ভিস) এবং সার্ভিস ডিক্লারেশন যোগ করে দেবে — ম্যানুয়ালি কিছু এডিট করতে হবে না।

**ধাপ ৩ — অ্যাপের এন্ট্রি ফাইলে (`index.js`) ওভারলে সারফেস রেজিস্টার করুন**

```jsx
import { registerRootComponent } from 'expo';
import { registerOverlaySurface } from 'popscreen';
import App from './App';
import MyBubble from './MyBubble';

registerRootComponent(App);
registerOverlaySurface(MyBubble);  // ফ্লোটিং উইন্ডোর ভেতরে এই কম্পোনেন্ট দেখাবে
```

**ধাপ ৪ — ওভারলে কম্পোনেন্ট বানান**

```tsx
// MyBubble.tsx
import { PopScreenContent } from 'popscreen';

export default function MyBubble() {
  return (
    <PopScreenContent>
      {/* এখানে যেকোনো React Native UI */}
    </PopScreenContent>
  );
}
```

**ধাপ ৫ — পারমিশন নিয়ে ওভারলে চালু করুন (main অ্যাপ থেকে)**

```jsx
import * as PopScreen from 'popscreen';

await PopScreen.requestOverlayPermission();  // "Display over other apps" পারমিশন
await PopScreen.show();                      // ফ্লোটিং উইন্ডো খুলবে
```

**ধাপ ৬ — (ঐচ্ছিক) main অ্যাপ ও ওভারলের মধ্যে state শেয়ার করুন**

```jsx
import { usePopScreen } from 'popscreen';

function MainScreen() {
  const [count, setCount] = usePopScreen('count', 0);
  // ওভারলেতেও একই usePopScreen('count') — দুজায়গাতেই সাথে সাথে আপডেট
}
```

**সম্পূর্ণ ফ্লো এক নজরে:**

| ধাপ | কাজ | কমান্ড/কোড |
|---|---|---|
| ১ | ইন্সটল | `npx expo install popscreen` + `expo-dev-client` |
| ২ | prebuild | `npx expo prebuild --platform android` |
| ৩ | সারফেস রেজিস্টার | `registerOverlaySurface(MyBubble)` |
| ৪ | UI বানান | `<PopScreenContent>`-এ নিজের কম্পোনেন্ট |
| ৫ | চালু করুন | `requestOverlayPermission()` → `show()` |
| ৬ | state শেয়ার (ঐচ্ছিক) | `usePopScreen('key', default)` |

বিস্তারিত API-র জন্য ডকুমেন্টেশন: `docs/api-reference.md`, `docs/state-sync.md`, আর `README.md`। ডেভেলপারের অ্যাপ **Google Play-তে** দিতে চাইলে `docs/play-policy-guidance.md`-ও পড়া উচিত (ওভারলে অ্যাপের জন্য প্লে স্টোরের বিশেষ নিয়ম আছে)।

const fs = require('fs');
const p = 'src/lib/subscriptions.ts';
let s = fs.readFileSync(p, 'utf8');

const from = `export function canPostTweets(tier: UserTier): boolean {
  return tier === "plus" || tier === "creator";
}`;

const to = `export function canPostTweets(tier: UserTier): boolean {
  return tier === "creator";
}`;

if (s.includes(from)) {
  s = s.replace(from, to);
  fs.writeFileSync(p, s);
  console.log('OK: Tweets are now strictly Creator-only.');
} else {
  console.error('WARN: canPostTweets pattern not found!');
}

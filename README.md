# ITCertPrep

An offline-first Expo Router study app for IT certification preparation. Bundled JSON is the editable content source; SQLite stores category metadata, topics, sections, questions and local question progress. No backend or network is needed for normal use.

## Start

Install Node.js 22 and dependencies, then run `npm install` and `npx expo start`.

## Content

Add or update category JSON files under `src/content/` and register them in `src/db/content.ts`. IDs are stable; increment `contentVersion` when changing a category's catalogue. Questions support true/false and single-answer multiple choice. The importer validates references and replaces changed content transactionally while preserving progress for stable question IDs.

## CI

GitHub Actions runs typecheck, lint and tests on pushes to `main`, pull requests and manual dispatch. The Android job builds a standalone release APK and updates the `latest-apk` prerelease.

# kvidai Web Push — Integration Guide

## Overview

Push notification delivery via kvidai web push SDK. Currently STUB.

## Current Status

`packages/shared/send-push-kvidai/src/index.ts` throws until SDK is ready.

## After kvidai Push SDK Completes

Replace stub in `packages/shared/send-push-kvidai/src/index.ts`.

## push-template Role

- `packages/push-template/in/{slug}/brief.json` — push content planning
- `packages/push-template/prompts/` — AI copy generation prompts

## Push Copy Guidelines

- **Title**: ≤40 chars, immediate value
- **Body**: ≤120 chars, drive click
- **Icon**: brand logo, 192×192px PNG recommended
- **URL**: specific landing page, not homepage

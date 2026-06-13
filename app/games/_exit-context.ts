"use client"

import { createContext } from "react"

// The shell provides this so a game can close its fullscreen overlay on exit.
// Defaults to a no-op for any standalone use.
export const GameExitContext = createContext<() => void>(() => {})

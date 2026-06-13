"use client"

import type { ComponentType } from "react"

type GameComponent = ComponentType
type GameModule = { default: GameComponent }
type GameLoader = () => Promise<GameModule>

const GAME_LOADERS: Record<string, GameLoader> = {
  snake: () => import("./snake"),
  "2048": () => import("./g2048"),
  tetris: () => import("./tetris"),
  breakout: () => import("./breakout"),
  asteroids: () => import("./asteroids"),
  flappy: () => import("./flappy"),
  wordle: () => import("./wordle"),
  minesweeper: () => import("./minesweeper"),
  life: () => import("./life"),
  pong: () => import("./pong"),
  threebody: () => import("./threebody"),
}

const GAME_MODULES = new Map<string, Promise<GameModule>>()

export function loadGame(name: string): Promise<GameModule> | null {
  const load = GAME_LOADERS[name]
  if (!load) return null

  let pending = GAME_MODULES.get(name)
  if (!pending) {
    pending = load()
    GAME_MODULES.set(name, pending)
  }
  return pending
}

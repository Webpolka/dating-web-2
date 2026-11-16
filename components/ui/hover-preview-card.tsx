"use client"

// ============================================================
// HoverPreviewCard — собственный движок hover-карточки.
//
// Не зависит от shadcn/ui и @base-ui/react. Полностью своя реализация:
//   - React context для связи Trigger ↔ Content
//   - createPortal — рендер контента в document.body
//   - Mouse events + таймеры: openDelay / closeDelay (hover intent)
//   - Плавная анимация через CSS transition (ТОЛЬКО opacity + translate)
//   - Auto-flip: не помещается с указанной стороны — переворачивается
//   - Auto-shift: выходит за viewport — сдвигается, чтобы поместиться
//   - Arrow (носик): автоматически позиционируется стороной к триггеру
//   - Singleton: открытие новой карточки мгновенно закрывает все другие
//
// Архитектура состояния — фазовый автомат вместо двух независимых boolean:
//
//   closed ──open()──[openDelay]──▶ opening ──rAF×2──▶ open
//     ▲                              │                  │
//     │                            close()            close()
//     │                              ▼ [closeDelay]    │
//     └─────[unmount timer]────── closing ◀───────────┘
//
//   - "opening" — смонтирована, невидима (opacity-0): измерение и подготовка
//   - "open"    — полностью открыта (opacity-100)
//   - "closing" — плавно исчезает, затем размонтируется
//   - closeNow() минует все задержки и анимации → "closed" немедленно
//
// Почему так:
//   - Одно состояние вместо isOpen+isMounted → невозможны противоречивые
//     комбинации (mounted=false при isOpen=true и т.п.)
//   - Все переходы идут через setPhase() → phaseRef всегда актуален,
//     таймеры никогда не читают устаревший state (нет stale closures)
//   - clearAllTimers() вызывается перед КАЖДЫМ планированием и при
//     размонтировании → ни один таймер/rAF не «всплывёт» позже и не
//     оживит закрытую карточку (фикс race condition прошлой версии)
//
// DOM-нода триггера хранится в useState (triggerNode), а не в useRef:
//   - сеттер state — не ref-мутатор → проходит правило react-hooks/refs
//     (React Compiler) и preserve-manual-memoization без единого disable
//   - компилятор корректно выводит зависимости (нода — обычное значение)
//   - если триггер размонтировался, пока карточка открыта — карточка
//     закроется сама (guard-эффект в Content)
//
// Поведение:
//   - scroll (capture, любой контейнер) / resize → мгновенный closeNow().
//     Скролл ВНУТРИ самой карточки её не закрывает — контент можно скроллить.
//   - мышь ушла за пределы документа → closeNow()
//   - Escape → closeNow()
//   - Размер контента изменился, пока карточка открыта (подгрузился шрифт/
//     картинка) → ResizeObserver пересчитывает позицию без лишних рендеров
//     (bail-out, если ничего не поменялось)
//
// Доступность и хуки для стилизации:
//   - Trigger: aria-haspopup="dialog" + aria-expanded
//   - Content: data-state="open|closed", data-side="top|bottom|left|right"
//     → можно стилизовать через tailwind-варианты (data-[side=top]:...)
//
// API:
//   <HoverPreviewCard openDelay={0} closeDelay={300}>
//     <HoverPreviewCardTrigger as="button">...</HoverPreviewCardTrigger>
//     <HoverPreviewCardContent side="bottom" align="center" sideOffset={8} arrow>
//       ...
//     </HoverPreviewCardContent>
//   </HoverPreviewCard>
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

// ============================================================
// Константы
// ============================================================

/** Длительность анимации появления/исчезновения (мс).
 *  Должна совпадать с duration-100 в классах Content. */
const ANIMATION_DURATION_MS = 250

/** Минимальный отступ карточки от краёв viewport (px). */
const VIEWPORT_MARGIN_PX = 8

// ============================================================
// Isomorphic useLayoutEffect: на сервере подменяем на useEffect,
// чтобы Next.js не кидал warning «useLayoutEffect does nothing on
// the server» при SSR-пререндере клиентских компонентов.
// ============================================================
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

// ============================================================
// Singleton — реестр close-функций всех смонтированных карточек.
// При открытии новой карточки все остальные мгновенно закрываются
// через closeNow() — наслоение карточек невозможно.
// ============================================================
const closeHandlers = new Set<() => void>()

function registerCloser(closer: () => void): () => void {
  closeHandlers.add(closer)
  // Возвращаем функцию отписки — вызывается при размонтировании Root.
  return () => {
    closeHandlers.delete(closer)
  }
}

function closeAllOthers(except: (() => void) | null): void {
  // Итерируемся по снимку: защищаемся от мутации Set во время итерации.
  for (const closer of Array.from(closeHandlers)) {
    if (closer !== except) closer()
  }
}

// ============================================================
// Типы
// ============================================================
export type HoverPreviewCardSide = "top" | "bottom" | "left" | "right"
export type HoverPreviewCardAlign = "start" | "center" | "end"

/** Фазовый автомат жизненного цикла карточки (см. схему в шапке файла). */
type Phase = "closed" | "opening" | "open" | "closing"

/** Итоговое положение карточки: координаты + сторона после auto-flip. */
interface Placement {
  top: number
  left: number
  side: HoverPreviewCardSide
}

interface HoverPreviewCardContextValue {
  open: () => void
  close: () => void
  /** Мгновенное закрытие без closeDelay и без анимации. */
  closeNow: () => void
  /** Контент смонтирован в DOM (фазы opening / open / closing). */
  isMounted: boolean
  /** Карточка полностью открыта (opacity-100). */
  isOpen: boolean
  /** DOM-нода триггера (для вычисления позиции). null = триггер не смонтирован. */
  triggerNode: HTMLElement | null
  /** Стабильный сеттер ноды триггера — передаётся напрямую в ref триггера. */
  setTriggerNode: (node: HTMLElement | null) => void
}

const HoverPreviewCardContext =
  createContext<HoverPreviewCardContextValue | null>(null)

function useHoverPreviewCardContext(): HoverPreviewCardContextValue {
  const ctx = useContext(HoverPreviewCardContext)
  if (!ctx) {
    throw new Error(
      "HoverPreviewCard components must be used within <HoverPreviewCard>",
    )
  }
  return ctx
}

// ============================================================
// Чистые помощники (модульный уровень — без замыканий на state)
// ============================================================

/** Стили носика: повернутый квадрат стороной к триггеру. */
function getArrowPlacement(
  side: HoverPreviewCardSide,
  size: number,
): CSSProperties {
  switch (side) {
    case "bottom":
      return { top: -size / 2, left: "50%", transform: "translateX(-50%) rotate(45deg)" }
    case "top":
      return { bottom: -size / 2, left: "50%", transform: "translateX(-50%) rotate(225deg)" }
    case "right":
      return { left: -size / 2, top: "50%", transform: "translateY(-50%) rotate(-45deg)" }
    case "left":
      return { right: -size / 2, top: "50%", transform: "translateY(-50%) rotate(135deg)" }
  }
}

// ============================================================
// Root — владеет состоянием (фазовый автомат) и всеми таймерами
// ============================================================
interface HoverPreviewCardProps {
  children: ReactNode
  /** Задержка перед открытием (мс). По умолчанию 0 — мгновенно. */
  openDelay?: number
  /** Задержка перед закрытием (мс). По умолчанию 300 — hover intent. */
  closeDelay?: number
}

export function HoverPreviewCard({
  children,
  openDelay = 0,
  closeDelay = 0,
}: HoverPreviewCardProps) {
  const [phase, setPhaseState] = useState<Phase>("closed")

  // DOM-нода триггера в state (не в ref!): см. пояснение в шапке файла.
  const [triggerNode, setTriggerNode] = useState<HTMLElement | null>(null)

  // Актуальное зеркало phase для чтения внутри таймеров/rAF.
  // Записи идут ТОЛЬКО через setPhase, поэтому ref никогда не расходится
  // со state — таймеры всегда видят реальную фазу (нет stale closures).
  const phaseRef = useRef<Phase>("closed")
  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next
    setPhaseState(next)
  }, [])

  // --- Все асинхронные ресурсы: три таймера + rAF -----------------
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  /** Полная очистка всех таймеров и rAF. Вызывается перед каждым новым
   *  планированием, в closeNow() и при размонтировании — отложенный
   *  колбэк физически не может сработать «позже» и оживить карточку. */
  const clearAllTimers = useCallback(() => {
    const openTimer = openTimerRef.current
    if (openTimer !== null) {
      clearTimeout(openTimer)
      openTimerRef.current = null
    }
    const closeTimer = closeTimerRef.current
    if (closeTimer !== null) {
      clearTimeout(closeTimer)
      closeTimerRef.current = null
    }
    const unmountTimer = unmountTimerRef.current
    if (unmountTimer !== null) {
      clearTimeout(unmountTimer)
      unmountTimerRef.current = null
    }
    const rafId = rafRef.current
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafRef.current = null
    }
  }, [])

  /** Мгновенное закрытие: без closeDelay и без анимации. */
  const closeNow = useCallback(() => {
    clearAllTimers()
    setPhase("closed")
  }, [clearAllTimers, setPhase])

  /** Анимация входа: элемент уже смонтирован с opacity-0. Двойной rAF
   *  гарантирует, что браузер закоммитил стартовые стили до переключения
   *  в "open" — иначе CSS transition не проиграется. id обоих кадров
   *  хранится в rafRef и отменяется в clearAllTimers. */
  const playEnterAnimation = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        setPhase("open")
      })
    })
  }, [setPhase])

  const open = useCallback(() => {
    // Открытие новой карточки мгновенно закрывает все другие (singleton).
    closeAllOthers(closeNow)
    clearAllTimers()

    if (phaseRef.current === "open") return

    openTimerRef.current = setTimeout(() => {
      openTimerRef.current = null
      if (phaseRef.current === "closing") {
        // Карточка ещё в DOM (плавно исчезала) — просто возвращаем видимость,
        // без повторного монтирования и мерцания.
        playEnterAnimation()
        return
      }
      setPhase("opening")
      playEnterAnimation()
    }, openDelay)
  }, [openDelay, clearAllTimers, closeNow, setPhase, playEnterAnimation])

  const close = useCallback(() => {
    clearAllTimers()
    const current = phaseRef.current

    if (current === "closed") {
      // Уже закрыта — не планируем «зомби»-таймеры.
      return
    }

    if (current === "opening") {
      // Мышь ушла до того, как карточка стала видимой, — размонтируем сразу.
      setPhase("closed")
      return
    }

    if (current === "closing") {
      // Исчезновение уже идёт — завершаем размонтирование без рестарта closeDelay.
      unmountTimerRef.current = setTimeout(() => {
        unmountTimerRef.current = null
        setPhase("closed")
      }, ANIMATION_DURATION_MS)
      return
    }

    // current === "open": hover-intent — ждём closeDelay, затем фейд и unmount.
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null
      setPhase("closing")
      unmountTimerRef.current = setTimeout(() => {
        unmountTimerRef.current = null
        setPhase("closed")
      }, ANIMATION_DURATION_MS)
    }, closeDelay)
  }, [closeDelay, clearAllTimers, setPhase])

  // --- Эффекты ----------------------------------------------------

  // Регистрация в singleton-реестре: открытие любой другой карточки
  // мгновенно закроет эту. Отписка — при размонтировании (нет утечек).
  useEffect(() => registerCloser(closeNow), [closeNow])

  // Финальная очистка всех таймеров/rAF при размонтировании Root.
  useEffect(() => () => clearAllTimers(), [clearAllTimers])

  // Escape — мгновенное закрытие открытой карточки (стандарт поведения).
  useEffect(() => {
    if (phase === "closed") return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNow()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [phase, closeNow])

  // --- Производные значения и контекст ----------------------------

  const isMounted = phase !== "closed"
  const isOpen = phase === "open"

  // Мемоизация: контекст и все его поля меняются ТОЛЬКО при смене фазы
  // или при монтировании/размонтировании триггера.
  // open / close / closeNow / setTriggerNode стабильны → потребители
  // (Trigger, Content) не ререндерятся лишний раз.
  const contextValue = useMemo<HoverPreviewCardContextValue>(
    () => ({
      open,
      close,
      closeNow,
      isMounted,
      isOpen,
      triggerNode,
      setTriggerNode,
    }),
    [open, close, closeNow, isMounted, isOpen, triggerNode, setTriggerNode],
  )

  return (
    <HoverPreviewCardContext.Provider value={contextValue}>
      {children}
    </HoverPreviewCardContext.Provider>
  )
}

// ============================================================
// Trigger — элемент, при наведении на который открывается карточка.
//
// Полиморфный через as, при этом полностью типобезопасный: вместо
// `as any` и eslint-disable — четыре явные ветки JSX. setTriggerNode —
// обычный сеттер state, поэтому проходит react-hooks/refs без кашмаров.
// Пользовательские обработчики (onMouseEnter и т.д.) не затираются,
// а вызываются из наших.
// ============================================================
type HoverPreviewCardTriggerElement = "div" | "button" | "span" | "a"

interface HoverPreviewCardTriggerProps extends HTMLAttributes<HTMLElement> {
  /** Какой HTML-тег использовать для триггера. По умолчанию "div". */
  as?: HoverPreviewCardTriggerElement
  /** href — используется только вместе с as="a". */
  href?: string
}

export function HoverPreviewCardTrigger(props: HoverPreviewCardTriggerProps) {
  // Деструктуризация обязательна: правило react-hooks/refs (React Compiler)
  // запрещает обращаться к полям context как к значениям во время рендера
  // (ctx.setTriggerNode → error), а деструктурированные локальные константы —
  // корректный паттерн.
  const { isOpen, open, close, setTriggerNode } = useHoverPreviewCardContext()
  const { as = "div", className, children, href, ...restProps } = props

  const handleMouseEnter = (event: ReactMouseEvent<HTMLElement>) => {
    restProps.onMouseEnter?.(event)
    open()
  }
  const handleMouseLeave = (event: ReactMouseEvent<HTMLElement>) => {
    restProps.onMouseLeave?.(event)
    close()
  }
  const handleFocus = (event: ReactFocusEvent<HTMLElement>) => {
    restProps.onFocus?.(event)
    open()
  }
  const handleBlur = (event: ReactFocusEvent<HTMLElement>) => {
    restProps.onBlur?.(event)
    close()
  }

  const interactionProps = {
    className,
    "aria-expanded": isOpen,
    "aria-haspopup": "dialog",
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
  } satisfies HTMLAttributes<HTMLElement>

  switch (as) {
    case "a":
      return (
        <a ref={setTriggerNode} href={href} {...restProps} {...interactionProps}>
          {children}
        </a>
      )
    case "button":
      return (
        <button
          type="button"
          ref={setTriggerNode}
          {...restProps}
          {...interactionProps}
        >
          {children}
        </button>
      )
    case "span":
      return (
        <span ref={setTriggerNode} {...restProps} {...interactionProps}>
          {children}
        </span>
      )
    default:
      return (
        <div ref={setTriggerNode} {...restProps} {...interactionProps}>
          {children}
        </div>
      )
  }
}

// ============================================================
// Content — контент карточки, рендерится через Portal в document.body
// ============================================================
interface HoverPreviewCardContentProps {
  children: ReactNode
  className?: string
  /** Сторона от триггера: "top" | "bottom" | "left" | "right". По умолчанию "bottom". */
  side?: HoverPreviewCardSide
  /** Выравнивание по перпендикулярной оси: "start" | "center" | "end". По умолчанию "center". */
  align?: HoverPreviewCardAlign
  /** Отступ от триггера по основной оси (px). По умолчанию 8. */
  sideOffset?: number
  /** Смещение по перпендикулярной оси (px). По умолчанию 0. */
  alignOffset?: number
  /** Показывать ли носик (стрелку). По умолчанию true. */
  arrow?: boolean
  /** Кастомные классы для носика. */
  arrowClassName?: string
  /** Размер носика (px). По умолчанию 12. */
  arrowSize?: number
}

export function HoverPreviewCardContent({
  children,
  className,
  side: preferredSide = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  arrow = true,
  arrowClassName,
  arrowSize = 12,
}: HoverPreviewCardContentProps) {
  const {
    isMounted,
    isOpen,
    triggerNode,
    open,
    close,
    closeNow,
  } = useHoverPreviewCardContext()

  // contentRef локален: он нужен только Content'у (измерение + ref на div).
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Позиция и фактическая сторона (после auto-flip) — одним объектом.
  const [placement, setPlacement] = useState<Placement | null>(null)

  /** Записываем placement в state ТОЛЬКО если он реально изменился:
   *  возвращаем prev → React делает bail-out → лишнего рендера нет. */
  const applyPlacement = useCallback((next: Placement | null) => {
    if (!next) return
    setPlacement((prev) =>
      prev !== null &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.side === next.side
        ? prev
        : next,
    )
  }, [])

  /** Вычисление позиции: auto-flip → основная ось → align → auto-shift.
   *  Чистая функция над triggerNode/contentRef — используется и при
   *  монтировании, и в ResizeObserver. Размер контента берём из
   *  offsetWidth/offsetHeight: это layout-размеры, transform/translate
   *  на них не влияют. */
  const computePlacement = useCallback((): Placement | null => {
    const content = contentRef.current
    if (!triggerNode || !content) return null

    const triggerRect = triggerNode.getBoundingClientRect()
    const contentWidth = content.offsetWidth
    const contentHeight = content.offsetHeight
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // === Auto-flip: не помещается с указанной стороны — переворачиваем ===
    let side = preferredSide
    if (
      preferredSide === "bottom" &&
      triggerRect.bottom + sideOffset + contentHeight > viewportHeight
    ) {
      side = "top"
    } else if (
      preferredSide === "top" &&
      triggerRect.top - sideOffset - contentHeight < 0
    ) {
      side = "bottom"
    } else if (
      preferredSide === "right" &&
      triggerRect.right + sideOffset + contentWidth > viewportWidth
    ) {
      side = "left"
    } else if (
      preferredSide === "left" &&
      triggerRect.left - sideOffset - contentWidth < 0
    ) {
      side = "right"
    }

    let top = 0
    let left = 0

    // === Основная ось (top/left) — зависит от фактической стороны ===
    switch (side) {
      case "bottom":
        top = triggerRect.bottom + sideOffset
        break
      case "top":
        top = triggerRect.top - contentHeight - sideOffset
        break
      case "right":
        left = triggerRect.right + sideOffset
        break
      case "left":
        left = triggerRect.left - contentWidth - sideOffset
        break
    }

    // === Перпендикулярная ось — зависит от align ===
    if (side === "top" || side === "bottom") {
      if (align === "start") {
        left = triggerRect.left + alignOffset
      } else if (align === "end") {
        left = triggerRect.right - contentWidth - alignOffset
      } else {
        left =
          triggerRect.left + triggerRect.width / 2 - contentWidth / 2 + alignOffset
      }
    } else {
      if (align === "start") {
        top = triggerRect.top + alignOffset
      } else if (align === "end") {
        top = triggerRect.bottom - contentHeight - alignOffset
      } else {
        top =
          triggerRect.top + triggerRect.height / 2 - contentHeight / 2 + alignOffset
      }
    }

    // === Auto-shift: не даём карточке выйти за viewport ===
    left = Math.max(
      VIEWPORT_MARGIN_PX,
      Math.min(left, viewportWidth - contentWidth - VIEWPORT_MARGIN_PX),
    )
    top = Math.max(
      VIEWPORT_MARGIN_PX,
      Math.min(top, viewportHeight - contentHeight - VIEWPORT_MARGIN_PX),
    )

    return { top, left, side }
  }, [triggerNode, preferredSide, align, sideOffset, alignOffset])

  // === Позиция вычисляется СИНХРОННО ДО paint (useLayoutEffect) —
  // карточка ни на один кадр не появляется в неправильном месте. ===
  useIsomorphicLayoutEffect(() => {
    if (!isMounted) return
    applyPlacement(computePlacement())
  }, [isMounted, computePlacement, applyPlacement])

  // === Размер контента изменился, пока карточка открыта (шрифт/картинка
  // подгрузились) → пересчитываем позицию. Благодаря bail-out в
  // applyPlacement это не создаёт ни одного лишнего рендера. ===
  useEffect(() => {
    if (!isMounted) return
    const content = contentRef.current
    if (!content || typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(() => {
      applyPlacement(computePlacement())
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [isMounted, computePlacement, applyPlacement])

  // === Триггер размонтировался, пока карточка открыта (mouseleave уже
  // не придёт) → закрываем мгновенно, карточка не может «зависнуть». ===
  useEffect(() => {
    if (isMounted && triggerNode === null) closeNow()
  }, [isMounted, triggerNode, closeNow])

  // === scroll (capture — ловит скролл в любом контейнере) и resize →
  // мгновенный closeNow без анимации: позиция привязана к триггеру,
  // поэтому пересчёт не делаем. Скролл ВНУТРИ самой карточки закрытие
  // не триггерит — длинный контент можно скроллить. ===
  useEffect(() => {
    if (!isMounted) return

    const handleScroll = (event: Event) => {
      const content = contentRef.current
      if (
        content &&
        event.target instanceof Node &&
        content.contains(event.target)
      ) {
        return
      }
      closeNow()
    }
    const handleResize = () => closeNow()

    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleResize)
    }
  }, [isMounted, closeNow])

  // === Подстраховка: мышь покинула документ (relatedTarget === null —
  // ушла за окно/в адресную строку) → мгновенно закрываем, даже если
  // onMouseLeave не успел отработать. ===
  useEffect(() => {
    if (!isMounted) return

    const handleMouseOut = (event: MouseEvent) => {
      if (
        event.relatedTarget === null ||
        event.relatedTarget === document.documentElement
      ) {
        closeNow()
      }
    }
    document.addEventListener("mouseout", handleMouseOut)
    return () => document.removeEventListener("mouseout", handleMouseOut)
  }, [isMounted, closeNow])

  // Все хуки объявлены выше — теперь безопасный условный return.
  if (!isMounted) return null

  const actualSide = placement?.side ?? preferredSide

  return createPortal(
    <div
      ref={contentRef}
      data-state={isOpen ? "open" : "closed"}
      data-side={actualSide}
      className={cn(
        "fixed z-50 outline-hidden",
        // Анимируем ТОЛЬКО opacity и translate — top/left меняются мгновенно,
        // поэтому «прилёта» из -9999 нет даже при первом открытии.
        // (Tailwind v4: translate-утилиты используют CSS-свойство translate.)
        // "transition-[opacity,translate] duration-100 ease-out motion-reduce:transition-none",
        // isOpen ? "opacity-100" : "opacity-0",
        // isOpen ? "translate-x-0 translate-y-0" : HIDDEN_TRANSLATE[actualSide],
        // Стили карточки (переопределяются через className)
        "rounded-lg bg-popover p-2.5 text-sm text-popover-foreground ring-1 ring-foreground/10",
        className,
      )}
      style={{
        // Если позиция ещё не вычислена — за пределами viewport.
        // Благодаря useLayoutEffect это значение не попадает в paint.
        top: placement?.top ?? -9999,
        left: placement?.left ?? -9999,
      }}
      // Hover intent: наведение на контент отменяет закрытие
      // (и оживляет карточку в фазе closing).
      onMouseEnter={open}
      onMouseLeave={close}
    >
      {arrow && (
        <div
          className={arrowClassName}
          style={{
            position: "absolute",
            width: arrowSize,
            height: arrowSize,
            background: "var(--popover, white)",
            borderTop: "1px solid var(--border, rgb(229 231 235 / 0.1))",
            borderLeft: "1px solid var(--border, rgb(229 231 235 / 0.1))",
            ...getArrowPlacement(actualSide, arrowSize),
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>,
    document.body,
  )
}

export { useHoverPreviewCardContext }

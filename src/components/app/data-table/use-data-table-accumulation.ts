import { useEffect, useRef, useState } from 'react'

/**
 * Hook that accumulates data across pages for mobile infinite-scroll.
 * On desktop (isMobile=false) it simply passes data through.
 */
export function useDataTableAccumulation<TData>(
  data: TData[],
  page: number,
  isMobile: boolean,
  getRowId: (row: TData) => string,
  onPageChange: (page: number) => void,
  totalRows: number,
  perPage: number,
  isRefetching: boolean,
  isLoading: boolean,
) {
  const [displayData, setDisplayData] = useState<TData[]>(data)
  const accumulatedDataRef = useRef<TData[]>([])
  const lastAccumulatedPageRef = useRef(page)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const lastDataRef = useRef<TData[]>([])
  const prevIsMobileRef = useRef(isMobile)
  const onPageChangeRef = useRef(onPageChange)
  onPageChangeRef.current = onPageChange

  // Reset when switching between mobile/desktop
  useEffect(() => {
    if (prevIsMobileRef.current !== isMobile) {
      prevIsMobileRef.current = isMobile
      if (page !== 1) {
        onPageChangeRef.current(1)
      }
    }
  }, [isMobile, page])

  // Accumulate data for mobile infinite scroll
  useEffect(() => {
    if (!isMobile) {
      accumulatedDataRef.current = data
      lastAccumulatedPageRef.current = page
      seenIdsRef.current = new Set(data.map(getRowId))
      lastDataRef.current = data
      return
    }

    if (data === lastDataRef.current && page === lastAccumulatedPageRef.current)
      return

    if (
      data === lastDataRef.current &&
      page !== lastAccumulatedPageRef.current
    ) {
      lastDataRef.current = data
      return
    }

    lastDataRef.current = data

    const hasNewItems = data.some(
      (item) => !seenIdsRef.current.has(getRowId(item)),
    )

    if (hasNewItems && page === lastAccumulatedPageRef.current + 1) {
      accumulatedDataRef.current = [...accumulatedDataRef.current, ...data]
      lastAccumulatedPageRef.current = page
    } else if (page !== lastAccumulatedPageRef.current) {
      accumulatedDataRef.current = data
      lastAccumulatedPageRef.current = page
    } else {
      accumulatedDataRef.current = data
    }

    seenIdsRef.current = new Set(accumulatedDataRef.current.map(getRowId))
    setDisplayData(accumulatedDataRef.current)
  }, [isMobile, page, data, getRowId])

  // Intersection observer for infinite scroll on mobile
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    if (!isMobile) {
      loadingMoreRef.current = false
      return
    }
    if (page * perPage >= totalRows) return
    if (isRefetching || isLoading) {
      loadingMoreRef.current = true
      return
    }
    loadingMoreRef.current = false

    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !loadingMoreRef.current) {
          loadingMoreRef.current = true
          onPageChangeRef.current(page + 1)
        }
      },
      { rootMargin: '400px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [isMobile, page, perPage, totalRows, isRefetching, isLoading])

  return { displayData: isMobile ? displayData : data, sentinelRef }
}

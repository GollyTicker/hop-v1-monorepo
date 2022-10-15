import React, { useEffect, useState, useMemo } from 'react'
import { useApp } from 'src/contexts/AppContext'
import { addresses, stakingRewardsContracts } from 'src/config'
import { toPercentDisplay } from 'src/utils'
import { findNetworkBySlug } from 'src/utils/networks'

export function usePoolStats () {
  const { sdk } = useApp()
  const [poolStats, setPoolStats] = useState<any>({})

  function normalizeTokenSymbol(symbol: string) {
    if (symbol === 'WETH') {
      symbol = 'ETH'
    }
    if (symbol === 'XDAI') {
      symbol = 'DAI'
    }
    if (symbol === 'WXDAI') {
      symbol = 'DAI'
    }
    if (symbol === 'WMATIC') {
      symbol = 'MATIC'
    }
    return symbol
  }

  function getPoolStats(chain: string, token: string) {
    token = normalizeTokenSymbol(token)
    return poolStats?.[chain]?.[token]
  }

  async function getPoolStatsFile () {
    const url = 'https://assets.hop.exchange/v1-pool-stats.json'
    const res = await fetch(url)
    const json = await res.json()
    console.log('pool stats data response:', json)
    if (!json.data) {
      throw new Error('expected data')
    }
    return json
  }

  useEffect(() => {
    async function update() {
      const json = await getPoolStatsFile()

      const _poolStats :any = {}
      for (const token in addresses.tokens) {
        const bridge = sdk.bridge(token)
        for (const chain of bridge.getSupportedLpChains()) {
          const symbol = normalizeTokenSymbol(token)
          if (!_poolStats[chain]) {
            _poolStats[chain] = {}
          }
          if (!_poolStats[chain][token]) {
            _poolStats[chain][token] = {
              apr: 0,
              aprFormatted: '',
              stakingApr: 0,
              stakingAprFormatted: '',
              totalApr: 0,
              totalAprFormatted: '',
              stakingAprChain: null
            }
          }
          const pool = _poolStats[chain][token]
          try {
            if (!json.data[symbol]) {
              throw new Error(`expected data for token symbol "${symbol}"`)
            }
            if (!json.data[symbol][chain]) {
              throw new Error(`expected data for network "${chain}"`)
            }
            if (json.data[symbol][chain].apr === undefined) {
              throw new Error(`expected apr value for token "${symbol}" and network "${chain}"`)
            }

            const apr = json.data[symbol][chain].apr ?? 0
            const stakingApr = json.data[symbol][chain].stakingApr ?? 0
            pool.apr = apr
            pool.aprFormatted = toPercentDisplay(apr)
            pool.stakingApr = stakingApr
            pool.stakingAprFormatted = toPercentDisplay(stakingApr)
            pool.totalApr = apr + stakingApr
            pool.totalAprFormatted = toPercentDisplay(apr + stakingApr)
            pool.stakingAprChain = findNetworkBySlug(chain)!
          } catch (err) {
            console.error(err)

            pool.aprFormatted = toPercentDisplay(0)
            pool.stakingAprFormatted = toPercentDisplay(0)
            pool.totalAprFormatted = toPercentDisplay(0)
          }
        }
      }
      setPoolStats(_poolStats)
    }
    update().catch(console.error)
  }, [])

   return {
     poolStats,
     getPoolStats
   }
}
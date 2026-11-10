// components/MoversTable.js
// Shared table for the gainers and losers pages (previously duplicated).
// `direction` is 'gainers' or 'losers' and only controls the % color.

import Link from 'next/link'
import Sparkline from './Sparkline'
import WatchlistStar from './WatchlistStar'
import { formatPrice, formatBigNumber, formatPercent } from '../lib/coingecko'

export default function MoversTable({ coins, direction = 'gainers' }) {
  const changeClass = direction === 'losers' ? 'down' : 'up'

  return (
    <div className="markets-table-wrap">
      <table className="markets-table movers-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th className="coin-col">Coin</th>
            <th className="right">Price</th>
            <th className="right">24h %</th>
            <th className="right">Volume (24h)</th>
            <th className="right">Market Cap</th>
            <th className="right">Last 7 days</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin, i) => {
            const sparkData = coin.sparkline_in_7d?.price || []
            const sparkPositive =
              sparkData.length > 1 && sparkData[sparkData.length - 1] >= sparkData[0]
            return (
              <tr key={coin.id}>
                <td className="rank">{i + 1}</td>
                <td>
                  <div className="coin-cell">
                    <WatchlistStar id={coin.id} symbol={coin.symbol} name={coin.name} />
                    <Link href={`/markets/${coin.id}`} className="coin-link">
                      <img src={coin.image} alt={coin.name} className="coin-img" />
                      <div className="coin-name-wrap">
                        <span className="coin-name">{coin.name}</span>
                        <span className="coin-symbol">{coin.symbol?.toUpperCase()}</span>
                      </div>
                    </Link>
                  </div>
                </td>
                <td className="right price">{formatPrice(coin.current_price)}</td>
                <td className={`right ${changeClass}`} style={{ fontWeight: 600 }}>
                  {formatPercent(coin.price_change_percentage_24h)}
                </td>
                <td className="right">{formatBigNumber(coin.total_volume)}</td>
                <td className="right">{formatBigNumber(coin.market_cap)}</td>
                <td className="right spark-cell">
                  <Sparkline data={sparkData} positive={sparkPositive} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// server/index.ts
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())

type MarketProduct = {
  id: string
  title: string
  price: number
  image: string
  url: string
  unit?: string
  packSize?: number
}

app.get('/api/silpo/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) return res.json([])
  // TODO: заменить на реальный поиск по официальному API или разрешённый парсинг
  const mock: MarketProduct[] = [
    { id: '1', title: `Мука пшеничная 1кг (${q})`, price: 39.9, image: 'https://via.placeholder.com/120', url: 'https://shop.silpo.ua/product/1', unit:'кг', packSize: 1 },
    { id: '2', title: `Мука пшеничная 2кг (${q})`, price: 69.9, image: 'https://via.placeholder.com/120', url: 'https://shop.silpo.ua/product/2', unit:'кг', packSize: 2 },
  ]
  res.json(mock)
})

app.listen(5174, () => console.log('API on http://localhost:5174'))
